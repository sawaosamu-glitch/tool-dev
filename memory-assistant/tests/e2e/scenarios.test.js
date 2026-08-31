const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../../src/app');
const { NoteStore } = require('../../src/services/noteStore');
const { SearchService } = require('../../src/services/searchService');
const { QAService } = require('../../src/services/qaService');
const { BackupService } = require('../../src/services/backupService');
const { ExportService } = require('../../src/services/exportService');
const { createTestDb, cleanupTestDb } = require('../fixtures/testDb');

// docs/E2E_SCENARIOS.mdの7シナリオに対応するE2Eテスト。
// E2E-06（境界値+プロセス強制終了からの復旧）のみ、実プロセスを起動する別ファイル(processRestart.test.js)で扱う。

function setupServer({ ollamaAvailable = false, ollamaAdapter } = {}) {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const searchService = new SearchService(ctx.db);
  const backupDir = '/tmp/memory-assistant-e2e-backups-' + Date.now() + Math.random();
  const exportDir = '/tmp/memory-assistant-e2e-exports-' + Date.now() + Math.random();
  const backupService = new BackupService(ctx.db, { backupDir });
  const exportService = new ExportService(noteStore, { exportDir });
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
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { ctx, server, baseUrl };
}

function teardown(env) {
  env.server.close();
  cleanupTestDb(env.ctx);
}

async function postJson(baseUrl, path, body, method = 'POST') {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// E2E-01: メモ登録と全文検索（正常系1）
test('E2E-01: メモ登録直後に検索でヒットする', async () => {
  const env = setupServer();
  try {
    const createRes = await postJson(env.baseUrl, '/api/notes', {
      title: '買い物メモ',
      body: '牛乳とパンとコーヒー豆を買う',
      tags: '生活',
    });
    assert.equal(createRes.status, 201);

    const searchRes = await fetch(`${env.baseUrl}/api/search?q=${encodeURIComponent('コーヒー')}`);
    const { results } = await searchRes.json();
    assert.equal(results.length, 1);
    assert.match(results[0].snippet, /コーヒー/);
  } finally {
    teardown(env);
  }
});

// E2E-02: 検索ベースQA（正常系2） — Ollama未検出環境
test('E2E-02: Ollama未検出環境では検索ベースQAが出典付きで返る', async () => {
  const env = setupServer({ ollamaAvailable: false });
  try {
    await postJson(env.baseUrl, '/api/notes', { body: '牛乳とパンとコーヒー豆を買う', title: '買い物メモ' });

    const res = await postJson(env.baseUrl, '/api/ask', { question: 'コーヒー豆について教えて' });
    const data = await res.json();
    assert.equal(data.mode, 'search');
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].note.title, '買い物メモ');
  } finally {
    teardown(env);
  }
});

// E2E-03: 生成ベースQA（正常系3） — Ollama検出環境
test('E2E-03: Ollama検出環境では生成ベースQAが出典付きで返る', async () => {
  const mockAdapter = { generate: async () => '牛乳とパンとコーヒー豆を買うと書かれています' };
  const env = setupServer({ ollamaAvailable: true, ollamaAdapter: mockAdapter });
  try {
    await postJson(env.baseUrl, '/api/notes', { body: '牛乳とパンとコーヒー豆を買う', title: '買い物メモ' });

    const res = await postJson(env.baseUrl, '/api/ask', { question: 'コーヒー豆について教えて' });
    const data = await res.json();
    assert.equal(data.mode, 'generated');
    assert.ok(data.answer.includes('コーヒー豆'));
    assert.equal(data.results.length, 1);
  } finally {
    teardown(env);
  }
});

// E2E-04: Ollama応答不可時のフォールバック（異常系1・外部障害）
test('E2E-04: Ollama呼び出し失敗時は検索ベースQAへフォールバックしエラーを露出しない', async () => {
  const failingAdapter = {
    generate: async () => {
      throw new Error('Ollamaタイムアウト（テスト用）');
    },
  };
  const env = setupServer({ ollamaAvailable: true, ollamaAdapter: failingAdapter });
  try {
    await postJson(env.baseUrl, '/api/notes', { body: '牛乳とパンとコーヒー豆を買う', title: '買い物メモ' });

    const res = await postJson(env.baseUrl, '/api/ask', { question: 'コーヒー豆について教えて' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.mode, 'search');
    assert.equal(data.error, undefined);
  } finally {
    teardown(env);
  }
});

// E2E-05: 不正入力と根拠なき回答の拒否（異常系2）
test('E2E-05a: 本文が空のメモ保存はエラーで保存されない', async () => {
  const env = setupServer();
  try {
    const res = await postJson(env.baseUrl, '/api/notes', { title: 't', body: '' });
    assert.equal(res.status, 400);
    const listRes = await fetch(`${env.baseUrl}/api/notes`);
    const { notes } = await listRes.json();
    assert.equal(notes.length, 0);
  } finally {
    teardown(env);
  }
});

test('E2E-05b: メモ0件で質問すると拒否される', async () => {
  const env = setupServer();
  try {
    const res = await postJson(env.baseUrl, '/api/ask', { question: '猫の名前は？' });
    const data = await res.json();
    assert.equal(data.mode, 'refused');
  } finally {
    teardown(env);
  }
});

test('E2E-05c: メモはあるが無関係な質問は拒否される（低関連度ケース）', async () => {
  const env = setupServer({ ollamaAvailable: true, ollamaAdapter: { generate: async () => 'ng' } });
  try {
    await postJson(env.baseUrl, '/api/notes', { body: '牛乳とパンを買う', title: '買い物メモ' });
    const res = await postJson(env.baseUrl, '/api/ask', {
      question: '買い物リストの管理方法についての一般的な考え方を教えてください',
    });
    const data = await res.json();
    assert.equal(data.mode, 'refused');
  } finally {
    teardown(env);
  }
});

// E2E-07: Ollamaモデル設定の切替（追加） — OllamaAdapterに渡すmodelがconfig値に応じて変わることを確認
test('E2E-07: config.jsonのモデル名変更がOllamaAdapterへのリクエストに反映される', async (t) => {
  const { OllamaAdapter } = require('../../src/adapters/ollamaAdapter');
  let capturedModel = null;
  t.mock.method(global, 'fetch', async (url, options) => {
    capturedModel = JSON.parse(options.body).model;
    return { ok: true, json: async () => ({ response: 'ok' }) };
  });

  const adapterDefault = new OllamaAdapter({ model: 'qwen3:4b' });
  await adapterDefault.generate('質問', []);
  assert.equal(capturedModel, 'qwen3:4b');

  const adapterChanged = new OllamaAdapter({ model: 'qwen3:8b' });
  await adapterChanged.generate('質問', []);
  assert.equal(capturedModel, 'qwen3:8b');
});
