const test = require('node:test');
const assert = require('node:assert/strict');
const { SearchService, extractTrigrams, buildFtsQuery } = require('../../src/services/searchService');
const { NoteStore } = require('../../src/services/noteStore');
const { ValidationError } = require('../../src/errors');
const { createTestDb, cleanupTestDb } = require('../fixtures/testDb');

// TC-UNIT-06: FR-SYS-001 全文検索
test('extractTrigrams: 3文字幅のスライディングウィンドウで重複除去して抽出する', () => {
  // 「コーヒー」(4文字)から3文字幅ウィンドウは2つ: [0:3]="コーヒ", [1:4]="ーヒー"
  const grams = extractTrigrams('コーヒー');
  assert.deepEqual(Array.from(grams).sort(), ['コーヒ', 'ーヒー'].sort());
});

test('extractTrigrams: 2文字以下は空集合', () => {
  assert.equal(extractTrigrams('あい').size, 0);
  assert.equal(extractTrigrams('').size, 0);
});

test('buildFtsQuery: グラムをOR結合したクエリ文字列を返す', () => {
  const q = buildFtsQuery('コーヒー');
  assert.match(q, /^".+"( OR ".+")*$/);
});

test('buildFtsQuery: 2文字以下はnullを返す', () => {
  assert.equal(buildFtsQuery('あい'), null);
});

test('SearchService.search: 2文字以下はValidationError', () => {
  const ctx = createTestDb();
  const search = new SearchService(ctx.db);
  assert.throws(() => search.search('あい'), ValidationError);
  cleanupTestDb(ctx);
});

test('SearchService.search: 登録直後のメモが3文字キーワードでヒットする', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const search = new SearchService(ctx.db);
  store.create({ title: '買い物メモ', body: '牛乳とパンとコーヒー豆を買う' });

  const results = search.search('コーヒー');
  assert.equal(results.length, 1);
  assert.equal(results[0].note.title, '買い物メモ');
  assert.ok(results[0].snippet.includes('コーヒー'));
  cleanupTestDb(ctx);
});

test('SearchService.search: 一致しないキーワードは空配列', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const search = new SearchService(ctx.db);
  store.create({ body: '牛乳とパンを買う' });

  assert.deepEqual(search.search('ラーメン'), []);
  cleanupTestDb(ctx);
});

test('SearchService.search: 編集・削除後のインデックスが同期される', () => {
  const ctx = createTestDb();
  const store = new NoteStore(ctx.db);
  const search = new SearchService(ctx.db);
  const note = store.create({ body: '牛乳を買う' });
  assert.equal(search.search('牛乳を').length, 1);

  store.update(note.id, { body: 'パンを買う' });
  assert.equal(search.search('牛乳を').length, 0);
  assert.equal(search.search('パンを買').length, 1);

  store.delete(note.id);
  assert.equal(search.search('パンを買').length, 0);
  cleanupTestDb(ctx);
});
