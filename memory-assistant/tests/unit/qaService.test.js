const test = require('node:test');
const assert = require('node:assert/strict');
const { QAService } = require('../../src/services/qaService');
const { SearchService } = require('../../src/services/searchService');
const { NoteStore } = require('../../src/services/noteStore');
const { createTestDb, cleanupTestDb } = require('../fixtures/testDb');

function makeMockOllamaAdapter({ shouldFail = false, response = 'モック回答' } = {}) {
  let generateCalls = 0;
  return {
    async generate() {
      generateCalls += 1;
      if (shouldFail) throw new Error('Ollama呼び出し失敗（テスト用）');
      return response;
    },
    getGenerateCallCount: () => generateCalls,
  };
}

// TC-UNIT-09: FR-SYS-004 検索結果0件時はOllamaを呼び出さず拒否する
test('QAService.ask: 検索結果0件はmode:refused、Ollamaを呼び出さない', async () => {
  const ctx = createTestDb();
  const searchService = new SearchService(ctx.db);
  const ollamaAdapter = makeMockOllamaAdapter();
  const qa = new QAService({ searchService, ollamaAdapter, ollamaAvailable: true });

  const result = await qa.ask('猫の名前は何ですか');
  assert.equal(result.mode, 'refused');
  assert.equal(ollamaAdapter.getGenerateCallCount(), 0);
  cleanupTestDb(ctx);
});

// TC-UNIT-09b: FR-SYS-004(b) 検索結果が1件以上でも低関連度なら拒否する（Codex役指摘C-001対応）
test('QAService.ask: 結果はあるが偶然の1トリグラム一致のみの場合は拒否する', async () => {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const searchService = new SearchService(ctx.db);
  const ollamaAdapter = makeMockOllamaAdapter();
  const qa = new QAService({ searchService, ollamaAdapter, ollamaAvailable: true });

  // 「買い物」の3文字だけが偶然一致するが、他の内容は無関係
  noteStore.create({ title: '買い物メモ', body: '牛乳とパンを買う' });

  const result = await qa.ask('買い物リストの管理方法についての一般的な考え方を教えてください');
  assert.equal(result.mode, 'refused');
  assert.equal(ollamaAdapter.getGenerateCallCount(), 0);
  cleanupTestDb(ctx);
});

// TC-UNIT-07: FR-SYS-002 Ollama未検出時は検索ベースQAのみ
test('QAService.ask: Ollama未検出時はmode:search', async () => {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const searchService = new SearchService(ctx.db);
  const ollamaAdapter = makeMockOllamaAdapter();
  const qa = new QAService({ searchService, ollamaAdapter, ollamaAvailable: false });

  noteStore.create({ title: '買い物メモ', body: '牛乳とパンとコーヒー豆を買う' });
  const result = await qa.ask('コーヒー豆について');
  assert.equal(result.mode, 'search');
  assert.equal(result.results.length, 1);
  assert.equal(ollamaAdapter.getGenerateCallCount(), 0);
  cleanupTestDb(ctx);
});

// TC-UNIT-08: FR-SYS-003 Ollama検出時は生成ベースQA
test('QAService.ask: Ollama利用可時はmode:generatedで回答を返す', async () => {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const searchService = new SearchService(ctx.db);
  const ollamaAdapter = makeMockOllamaAdapter({ response: 'コーヒー豆はスーパーで買います' });
  const qa = new QAService({ searchService, ollamaAdapter, ollamaAvailable: true });

  noteStore.create({ title: '買い物メモ', body: '牛乳とパンとコーヒー豆を買う' });
  const result = await qa.ask('コーヒー豆について教えて');
  assert.equal(result.mode, 'generated');
  assert.equal(result.answer, 'コーヒー豆はスーパーで買います');
  assert.equal(ollamaAdapter.getGenerateCallCount(), 1);
  cleanupTestDb(ctx);
});

// FR-SYS-003例外: Ollama呼び出し失敗時は検索ベースQAへフォールバックしエラーを露出しない
test('QAService.ask: Ollama呼び出し失敗時はmode:searchへフォールバックする', async () => {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const searchService = new SearchService(ctx.db);
  const ollamaAdapter = makeMockOllamaAdapter({ shouldFail: true });
  const qa = new QAService({ searchService, ollamaAdapter, ollamaAvailable: true });

  noteStore.create({ title: '買い物メモ', body: '牛乳とパンとコーヒー豆を買う' });
  const result = await qa.ask('コーヒー豆について教えて');
  assert.equal(result.mode, 'search');
  assert.ok(!('answer' in result) || result.answer === undefined);
  cleanupTestDb(ctx);
});

test('QAService.isRelevant: 結果0件はfalse', () => {
  const ctx = createTestDb();
  const searchService = new SearchService(ctx.db);
  const qa = new QAService({ searchService, ollamaAdapter: makeMockOllamaAdapter(), ollamaAvailable: true });
  assert.equal(qa.isRelevant([], '何か質問'), false);
  cleanupTestDb(ctx);
});
