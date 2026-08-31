const test = require('node:test');
const assert = require('node:assert/strict');
const { OllamaAdapter } = require('../../src/adapters/ollamaAdapter');

// TC-UNIT-13 / HARNESS.md H10: アプリが通信する宛先がlocalhost/127.0.0.1以外に増えていないかを機械的に検知する。
// NFR-SEC-001（外部送信なし）を、リリース前の手動確認(TC-MANUAL-03)だけでなくコミット単位で自動検知する。
test('H10: fetchで呼び出す宛先はlocalhost/127.0.0.1のみである', async (t) => {
  const calledUrls = [];
  t.mock.method(global, 'fetch', async (url) => {
    calledUrls.push(String(url));
    return { ok: true, json: async () => ({ response: 'ok' }) };
  });

  const adapter = new OllamaAdapter({ model: 'qwen3:4b' });
  await adapter.healthCheck();
  await adapter.generate('質問', ['コンテキスト']);

  assert.ok(calledUrls.length > 0, 'fetchが少なくとも1回呼ばれていること');
  for (const url of calledUrls) {
    const host = new URL(url).hostname;
    assert.ok(
      host === 'localhost' || host === '127.0.0.1',
      `localhost/127.0.0.1以外への通信を検知しました: ${url}`
    );
  }
});
