const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../../src/app');
const { NoteStore } = require('../../src/services/noteStore');
const { SearchService } = require('../../src/services/searchService');
const { QAService } = require('../../src/services/qaService');
const { BackupService } = require('../../src/services/backupService');
const { ExportService } = require('../../src/services/exportService');
const { createTestDb, cleanupTestDb } = require('../fixtures/testDb');

function setupServer({ ollamaAvailable = false, ollamaAdapter } = {}) {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const searchService = new SearchService(ctx.db);
  const backupService = new BackupService(ctx.db, { backupDir: '/tmp/memory-assistant-it-backups-' + Date.now() });
  const exportService = new ExportService(noteStore, { exportDir: '/tmp/memory-assistant-it-exports-' + Date.now() });
  const qaService = new QAService({
    searchService,
    ollamaAdapter: ollamaAdapter || { generate: async () => 'mock' },
    ollamaAvailable,
  });
  const app = createApp({
    noteStore,
    searchService,
    qaService,
    backupService,
    exportService,
    getOllamaAvailable: () => ollamaAvailable,
  });
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return { ctx, server, baseUrl };
}

function teardownServer({ ctx, server }) {
  server.close();
  cleanupTestDb(ctx);
}

// Integration: WebServer経由のメモCRUD（FR-DATA-001〜004）
test('POST/GET/PUT/DELETE /api/notes: 一連のCRUDが動作する', async () => {
  const env = setupServer();
  try {
    const createRes = await fetch(`${env.baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'タイトル', body: '本文', tags: 'a,b' }),
    });
    assert.equal(createRes.status, 201);
    const { note } = await createRes.json();
    assert.ok(note.id);

    const listRes = await fetch(`${env.baseUrl}/api/notes`);
    const { notes } = await listRes.json();
    assert.equal(notes.length, 1);

    const putRes = await fetch(`${env.baseUrl}/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '更新後', body: '更新本文', tags: '' }),
    });
    assert.equal(putRes.status, 200);

    const deleteNoConfirmRes = await fetch(`${env.baseUrl}/api/notes/${note.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(deleteNoConfirmRes.status, 400);

    const deleteRes = await fetch(`${env.baseUrl}/api/notes/${note.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.equal(deleteRes.status, 204);
  } finally {
    teardownServer(env);
  }
});

test('POST /api/notes: 本文が空だと400', async () => {
  const env = setupServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '' }),
    });
    assert.equal(res.status, 400);
  } finally {
    teardownServer(env);
  }
});

test('PUT /api/notes/:id: 存在しないIDは404、本文が空だと400', async () => {
  const env = setupServer();
  try {
    const notFoundRes = await fetch(`${env.baseUrl}/api/notes/9999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '本文' }),
    });
    assert.equal(notFoundRes.status, 404);

    const createRes = await fetch(`${env.baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '本文' }),
    });
    const { note } = await createRes.json();

    const invalidRes = await fetch(`${env.baseUrl}/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '' }),
    });
    assert.equal(invalidRes.status, 400);
  } finally {
    teardownServer(env);
  }
});

test('DELETE /api/notes/:id: 存在しないIDは404', async () => {
  const env = setupServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/notes/9999`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    assert.equal(res.status, 404);
  } finally {
    teardownServer(env);
  }
});

// Integration: 全文検索API（FR-SYS-001）
test('GET /api/search: クエリパラメータqがないと400', async () => {
  const env = setupServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/search`);
    assert.equal(res.status, 400);
  } finally {
    teardownServer(env);
  }
});

test('GET /api/search: 3文字未満は400、3文字以上はヒットする', async () => {
  const env = setupServer();
  try {
    await fetch(`${env.baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '牛乳とパンとコーヒー豆を買う' }),
    });

    const shortRes = await fetch(`${env.baseUrl}/api/search?q=${encodeURIComponent('コー')}`);
    assert.equal(shortRes.status, 400);

    const okRes = await fetch(`${env.baseUrl}/api/search?q=${encodeURIComponent('コーヒー')}`);
    assert.equal(okRes.status, 200);
    const { results } = await okRes.json();
    assert.equal(results.length, 1);
  } finally {
    teardownServer(env);
  }
});

// Integration: 質問応答API（FR-SYS-002, FR-SYS-004）
test('POST /api/ask: 検索結果0件はmode:refused', async () => {
  const env = setupServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '何もないはず' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.mode, 'refused');
  } finally {
    teardownServer(env);
  }
});

test('POST /api/ask: 質問が空文字は400', async () => {
  const env = setupServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '' }),
    });
    assert.equal(res.status, 400);
  } finally {
    teardownServer(env);
  }
});

// Integration: FR-EXT-001 状態表示、FR-SYS-005例外 バックアップ警告表示
test('GET /api/status: ollamaAvailableとbackupWarningを返す', async () => {
  const env = setupServer({ ollamaAvailable: true });
  try {
    const res = await fetch(`${env.baseUrl}/api/status`);
    const data = await res.json();
    assert.equal(data.ollamaAvailable, true);
    assert.equal(data.backupWarning, false);
  } finally {
    teardownServer(env);
  }
});

// Integration: FR-DATA-006 エクスポートAPI
test('POST /api/export: markdown形式でエクスポートできる', async () => {
  const env = setupServer();
  try {
    await fetch(`${env.baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'エクスポートテスト' }),
    });
    const res = await fetch(`${env.baseUrl}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'markdown' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.path);
  } finally {
    teardownServer(env);
  }
});

test('POST /api/export: 不正なformatは400', async () => {
  const env = setupServer();
  try {
    const res = await fetch(`${env.baseUrl}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'pdf' }),
    });
    assert.equal(res.status, 400);
  } finally {
    teardownServer(env);
  }
});
