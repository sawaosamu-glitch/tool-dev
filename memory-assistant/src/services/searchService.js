const { ValidationError } = require('../errors');

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 1000;
const RESULT_LIMIT = 20;

// SDD 1章 SearchService.buildFtsQuery(): ちょうど3文字幅のスライディングウィンドウでトリグラムを抽出しOR結合する。
// trigramトークナイザーは3文字未満のクエリに構造上マッチできないため（ADR-002実機検証済み）。
function extractTrigrams(text) {
  const chars = Array.from(text);
  const grams = new Set();
  for (let i = 0; i + 3 <= chars.length; i++) {
    const gram = chars.slice(i, i + 3).join('');
    if (gram.trim().length > 0) grams.add(gram);
  }
  return grams;
}

function buildFtsQuery(text) {
  const grams = extractTrigrams(text);
  if (grams.size === 0) return null;
  const parts = Array.from(grams).map((g) => `"${g.replace(/"/g, '""')}"`);
  return parts.join(' OR ');
}

// C-02 SearchService（SDD 1章）: FTS5によるキーワード検索、BM25ランキング、ハイライト抜粋生成
class SearchService {
  constructor(db) {
    this.db = db;
  }

  search(query) {
    if (typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) {
      throw new ValidationError(`検索キーワードは${MAX_QUERY_LENGTH}文字以内で入力してください`);
    }
    if (Array.from(query).length < MIN_QUERY_LENGTH) {
      throw new ValidationError(`${MIN_QUERY_LENGTH}文字以上入力してください`);
    }

    const ftsQuery = buildFtsQuery(query);
    if (!ftsQuery) return [];

    const rows = this.db
      .prepare(
        // ハイライト区切りにHTMLタグではなく制御文字(\x01/\x02)を使う。
        // メモ本文はユーザー入力でありエスケープされずにsnippet()へ渡るため、
        // ここで<mark>タグを直接埋め込むとクライアント側でinnerHTML経由のセルフXSSになりうる（C-SEC-003）。
        // クライアント側でtextNode単位に分解してから<mark>要素を組み立てる。
        `SELECT
           notes.*,
           snippet(notes_fts, 1, char(1), char(2), '…', 12) AS snippet,
           bm25(notes_fts) AS score
         FROM notes_fts
         JOIN notes ON notes.id = notes_fts.rowid
         WHERE notes_fts MATCH ?
         ORDER BY score ASC
         LIMIT ?`
      )
      .all(ftsQuery, RESULT_LIMIT);

    return rows.map((row) => ({
      note: {
        id: row.id,
        title: row.title,
        body: row.body,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      snippet: row.snippet,
      score: row.score,
    }));
  }
}

module.exports = { SearchService, extractTrigrams, buildFtsQuery, MIN_QUERY_LENGTH };
