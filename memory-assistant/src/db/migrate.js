const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

// SRS 9章/SDD 2章「起動フロー」に対応: WALモード設定 → スキーマ適用 → 整合性チェック
function openDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  const integrity = db.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') {
    const err = new Error(`データベースの整合性チェックに失敗しました: ${integrity}`);
    err.code = 'DB_INTEGRITY_FAILED';
    throw err;
  }

  return db;
}

module.exports = { openDatabase };
