const { ValidationError, NotFoundError } = require('../errors');
const { nowIso } = require('../util/datetime');
const { normalizeTags } = require('../util/tags');
const { logNoteOperation } = require('../util/logger');

const MAX_BODY_LENGTH = 50000;
const MAX_TITLE_LENGTH = 200;
const PAGE_SIZE = 50;

function validateBody(body) {
  if (typeof body !== 'string' || body.length < 1) {
    throw new ValidationError('本文を入力してください');
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw new ValidationError(`本文は${MAX_BODY_LENGTH}文字以内で入力してください`);
  }
}

// C-01 NoteStore（SDD 1章）: メモのCRUD、FTS5インデックス同期（DBトリガー経由）、整合性制約の適用
class NoteStore {
  constructor(db) {
    this.db = db;
  }

  create({ title = '', body, tags = '' }) {
    validateBody(body);
    const now = nowIso();
    const normalizedTitle = String(title).slice(0, MAX_TITLE_LENGTH);
    const normalizedTags = normalizeTags(tags);

    const stmt = this.db.prepare(
      'INSERT INTO notes (title, body, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    );
    const info = stmt.run(normalizedTitle, body, normalizedTags, now, now);
    logNoteOperation('create', info.lastInsertRowid);
    return this.findById(info.lastInsertRowid);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) || null;
  }

  findAll({ tag, page = 1 } = {}) {
    const offset = Math.max(0, (page - 1) * PAGE_SIZE);
    if (tag) {
      return this.db
        .prepare(
          `SELECT * FROM notes
           WHERE (',' || tags || ',') LIKE '%,' || ? || ',%'
           ORDER BY created_at DESC, id DESC
           LIMIT ? OFFSET ?`
        )
        .all(tag, PAGE_SIZE, offset);
    }
    return this.db
      .prepare('SELECT * FROM notes ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?')
      .all(PAGE_SIZE, offset);
  }

  update(id, { title, body, tags }) {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError(`メモが見つかりません: id=${id}`);
    }
    validateBody(body);
    const now = nowIso();
    const normalizedTitle = String(title ?? '').slice(0, MAX_TITLE_LENGTH);
    const normalizedTags = normalizeTags(tags);

    this.db
      .prepare('UPDATE notes SET title = ?, body = ?, tags = ?, updated_at = ? WHERE id = ?')
      .run(normalizedTitle, body, normalizedTags, now, id);
    logNoteOperation('update', id);
    return this.findById(id);
  }

  delete(id) {
    const info = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    const deleted = info.changes > 0;
    if (deleted) logNoteOperation('delete', id);
    return deleted;
  }

  countAll() {
    return this.db.prepare('SELECT COUNT(*) AS c FROM notes').get().c;
  }
}

module.exports = { NoteStore, MAX_BODY_LENGTH, MAX_TITLE_LENGTH };
