const test = require('node:test');
const assert = require('node:assert/strict');
const { OllamaAdapter } = require('../../src/adapters/ollamaAdapter');

// TC-UNIT-12: FR-EXT-001 Ollamaの有無を検出する
test('OllamaAdapter.healthCheck: 200応答でtrue', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: true }));
  const adapter = new OllamaAdapter({ model: 'qwen3:4b' });
  assert.equal(await adapter.healthCheck(), true);
});

test('OllamaAdapter.healthCheck: 例外発生時はfalse（未検出扱い）', async (t) => {
  t.mock.method(global, 'fetch', async () => {
    throw new Error('接続失敗');
  });
  const adapter = new OllamaAdapter({ model: 'qwen3:4b' });
  assert.equal(await adapter.healthCheck(), false);
});

test('OllamaAdapter.generate: 応答のresponseフィールドを返す', async (t) => {
  t.mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({ response: '生成された回答' }),
  }));
  const adapter = new OllamaAdapter({ model: 'qwen3:4b' });
  const answer = await adapter.generate('質問', ['コンテキスト1']);
  assert.equal(answer, '生成された回答');
});

// IMPL-002: 思考モデルのレイテンシ対策としてthink:falseを送信する
test('OllamaAdapter.generate: リクエストボディにthink:falseとmodelを含む', async (t) => {
  let capturedBody = null;
  t.mock.method(global, 'fetch', async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ response: 'ok' }) };
  });
  const adapter = new OllamaAdapter({ model: 'qwen3:8b' });
  await adapter.generate('質問', []);
  assert.equal(capturedBody.think, false);
  assert.equal(capturedBody.model, 'qwen3:8b');
  assert.equal(capturedBody.stream, false);
});

test('OllamaAdapter.generate: HTTPエラー応答は例外をthrowする', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: 500 }));
  const adapter = new OllamaAdapter({ model: 'qwen3:4b' });
  await assert.rejects(() => adapter.generate('質問', []));
});
