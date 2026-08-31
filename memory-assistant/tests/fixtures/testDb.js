const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Database = require('better-sqlite3');

// テスト用に独立した一時SQLiteファイルを都度生成する（本番data/を使わない。CONSTRAINTS C-DATA-006準拠）
function createTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-assistant-test-'));
  const dbPath = path.join(dir, 'test.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql'), 'utf8');
  db.exec(schema);
  return { db, dir, dbPath };
}

function cleanupTestDb({ db, dir }) {
  try {
    db.close();
  } catch {
    // already closed
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { createTestDb, cleanupTestDb };
