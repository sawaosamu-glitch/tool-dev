const test = require('node:test');
const assert = require('node:assert/strict');
const { NoteStore } = require('../../src/services/noteStore');
const { ValidationError, NotFoundError } = require('../../src/errors');
const { createTestDb, cleanupTestDb } = require('../fixtures/testDb');

// TC-UNIT-01: FR-DATA-001 メモの新規登録
test('NoteStore.create: 正常な本文で保存できる', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const note = store.create({ title: 'タイトル', body: '本文テスト', tags: 'a,b' });
  assert.equal(note.title, 'タイトル');
  assert.equal(note.body, '本文テスト');
  assert.equal(note.tags, 'a,b');
  assert.ok(note.id > 0);
  assert.ok(note.created_at);
  cleanupTestDb(ctx);
});

test('NoteStore.create: 本文が空の場合ValidationError', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  assert.throws(() => store.create({ title: 't', body: '' }), ValidationError);
  cleanupTestDb(ctx);
});

test('NoteStore.create: 本文50001文字はValidationError（境界値+1）', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const body = 'あ'.repeat(50001);
  assert.throws(() => store.create({ body }), ValidationError);
  cleanupTestDb(ctx);
});

test('NoteStore.create: 本文ちょうど50000文字は成功する（境界値）', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const body = 'あ'.repeat(50000);
  const note = store.create({ body });
  assert.equal(note.body.length, 50000);
  cleanupTestDb(ctx);
});

test('NoteStore.create: 本文ちょうど1文字は成功する（境界値）', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const note = store.create({ body: 'あ' });
  assert.equal(note.body, 'あ');
  cleanupTestDb(ctx);
});

test('NoteStore.create: タグは20個・各30文字に切り詰められる', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const manyTags = Array.from({ length: 25 }, (_, i) => `tag${i}`).join(',');
  const longTag = 'x'.repeat(50);
  const note = store.create({ body: 'b', tags: `${longTag},${manyTags}` });
  const tags = note.tags.split(',');
  assert.equal(tags.length, 20);
  assert.equal(tags[0].length, 30);
  cleanupTestDb(ctx);
});

// TC-UNIT-02: FR-DATA-002 一覧表示（created_at降順、idタイブレーク）
test('NoteStore.findAll: 登録日時降順・idタイブレークで並ぶ', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  // 同一秒内に複数作成されても id タイブレークで安定した順序になることを確認（Codex役指摘C-006）
  store.create({ body: '1件目' });
  store.create({ body: '2件目' });
  store.create({ body: '3件目' });
  const all = store.findAll();
  assert.equal(all.length, 3);
  assert.equal(all[0].body, '3件目');
  assert.equal(all[1].body, '2件目');
  assert.equal(all[2].body, '1件目');
  cleanupTestDb(ctx);
});

test('NoteStore.findAll: メモ0件は空配列', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  assert.deepEqual(store.findAll(), []);
  cleanupTestDb(ctx);
});

// TC-UNIT-05: FR-DATA-005 タグ絞込（部分一致誤マッチ防止、Codex役指摘C-015）
test('NoteStore.findAll: タグは完全一致で絞り込まれ部分文字列は誤マッチしない', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  store.create({ body: 'AI関連', tags: 'AI,仕事' });
  store.create({ body: 'AIチーム関連', tags: 'AIチーム' });
  const results = store.findAll({ tag: 'AI' });
  assert.equal(results.length, 1);
  assert.equal(results[0].body, 'AI関連');
  cleanupTestDb(ctx);
});

// TC-UNIT-03: FR-DATA-003 編集
test('NoteStore.update: 既存メモを更新できる', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const created = store.create({ title: '旧', body: '旧本文' });
  const updated = store.update(created.id, { title: '新', body: '新本文', tags: '' });
  assert.equal(updated.title, '新');
  assert.equal(updated.body, '新本文');
  assert.ok(updated.updated_at >= created.updated_at);
  cleanupTestDb(ctx);
});

test('NoteStore.update: 存在しないIDはNotFoundError', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  assert.throws(() => store.update(9999, { body: 'x' }), NotFoundError);
  cleanupTestDb(ctx);
});

// TC-UNIT-04: FR-DATA-004 削除
test('NoteStore.delete: 既存メモを削除するとtrueを返す', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const created = store.create({ body: '削除対象' });
  assert.equal(store.delete(created.id), true);
  assert.equal(store.findById(created.id), null);
  cleanupTestDb(ctx);
});

test('NoteStore.delete: 存在しないIDはfalseを返す（例外にしない、冪等性）', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  assert.equal(store.delete(9999), false);
  cleanupTestDb(ctx);
});

// BC-3: 文字コード境界（絵文字・特殊文字・NULL文字混入）
test('NoteStore.create: 絵文字・特殊記号を含む本文も保存・取得できる', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const body = '今日は良い天気☀️😀 <script>alert(1)</script> "quotes" \'apostrophe\'';
  const note = store.create({ body });
  const fetched = store.findById(note.id);
  assert.equal(fetched.body, body);
  cleanupTestDb(ctx);
});
