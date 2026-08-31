const { extractTrigrams } = require('./searchService');

const RESULT_LIMIT = 5;
const MIN_GRAM_MATCHES_FOR_SHORT_QUESTION = 1;
const MIN_GRAM_MATCHES_FOR_LONG_QUESTION = 2;
const SHORT_QUESTION_GRAM_THRESHOLD = 3;
const MIN_COVERAGE_RATIO = 0.15;

// C-03 QAService（SDD 1章）: 検索実行→根拠なき回答拒否判定(isRelevant)→(Ollama利用可なら)生成AI呼び出しの統制
class QAService {
  constructor({ searchService, ollamaAdapter, ollamaAvailable }) {
    this.searchService = searchService;
    this.ollamaAdapter = ollamaAdapter;
    this.ollamaAvailable = ollamaAvailable;
  }

  // FR-SYS-004: 検索結果0件、または低関連度（トリグラム一致数・カバレッジ率が閾値未満）の場合はfalse
  isRelevant(results, question) {
    if (!results || results.length === 0) return false;

    const qGrams = extractTrigrams(question);
    if (qGrams.size === 0) return false;

    const top = results[0].note;
    const haystack = `${top.title || ''}${top.body || ''}`;
    let matchCount = 0;
    for (const g of qGrams) {
      if (haystack.includes(g)) matchCount++;
    }

    const coverage = matchCount / qGrams.size;
    const minMatches =
      qGrams.size <= SHORT_QUESTION_GRAM_THRESHOLD
        ? MIN_GRAM_MATCHES_FOR_SHORT_QUESTION
        : MIN_GRAM_MATCHES_FOR_LONG_QUESTION;

    return matchCount >= minMatches && coverage >= MIN_COVERAGE_RATIO;
  }

  async ask(question) {
    let results;
    try {
      results = this.searchService.search(question).slice(0, RESULT_LIMIT);
    } catch {
      // 質問が3文字未満などでsearchが例外を投げた場合も「関連情報なし」として扱う
      results = [];
    }

    if (!this.isRelevant(results, question)) {
      return { mode: 'refused', results: [] };
    }

    if (!this.ollamaAvailable) {
      return { mode: 'search', results };
    }

    try {
      const contextSnippets = results.map((r) => `${r.note.title}\n${r.note.body}`);
      const answer = await this.ollamaAdapter.generate(question, contextSnippets);
      return { mode: 'generated', results, answer };
    } catch {
      // FR-SYS-003例外: Ollama失敗時はエラーを露出せず検索ベースQAへフォールバック
      return { mode: 'search', results };
    }
  }
}

module.exports = { QAService };
