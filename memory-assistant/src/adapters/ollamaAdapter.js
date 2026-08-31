const OLLAMA_BASE_URL = 'http://localhost:11434';
const HEALTHCHECK_TIMEOUT_MS = 3000;
const GENERATE_TIMEOUT_MS = 10000;

const SYSTEM_PROMPT =
  'あなたは提供されたメモの内容のみを根拠に回答するアシスタントです。' +
  'コンテキストに記載された内容のみを根拠に回答してください。' +
  'コンテキストに答えがない場合は「分かりません」と回答してください。';

// C-04 OllamaAdapter（SDD 1章）: Ollama REST APIのラッパー。H8/HARNESS.md準拠でlocalhost:11434以外には通信しない
class OllamaAdapter {
  constructor({ baseUrl = OLLAMA_BASE_URL, model } = {}) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async healthCheck() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(question, contextSnippets) {
    const contextText = contextSnippets
      .map((c, i) => `[出典${i + 1}] ${c}`)
      .join('\n\n');
    const prompt = `${SYSTEM_PROMPT}\n\n---コンテキスト---\n${contextText}\n\n---質問---\n${question}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // think:false — qwen3等の思考モデルは既定で内部思考トークンを生成し応答が大幅に遅くなる
        // （実機検証: think指定なしで約4秒、think:falseで約0.3秒。10秒タイムアウトに対し余裕を持たせる）。
        // 思考内容は最終回答(response)に含まれず利用者に見せる必要もないため無効化する。
        body: JSON.stringify({ model: this.model, prompt, stream: false, think: false }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Ollama応答エラー: HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.response ?? '';
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { OllamaAdapter, OLLAMA_BASE_URL };
