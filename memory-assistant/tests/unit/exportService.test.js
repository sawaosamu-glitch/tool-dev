const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ExportService } = require('../../src/services/exportService');
const { NoteStore } = require('../../src/services/noteStore');
const { ValidationError } = require('../../src/errors');
const { createTestDb, cleanupTestDb } = require('../fixtures/testDb');

function tmpExportDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-assistant-export-'));
}

// TC-UNIT-10: FR-DATA-006 エクスポート
test('ExportService.exportAll: markdown形式で全メモを出力する', () => {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const exportDir = tmpExportDir();
  const exportService = new ExportService(noteStore, { exportDir });

  noteStore.create({ title: 'メモ1', body: '本文1', tags: 'a' });
  noteStore.create({ title: 'メモ2', body: '本文2' });

  const result = exportService.exportAll('markdown');
  const content = fs.readFileSync(result.path, 'utf8');
  assert.ok(content.includes('メモ1'));
  assert.ok(content.includes('メモ2'));
  assert.ok(content.includes('本文1'));

  fs.rmSync(exportDir, { recursive: true, force: true });
  cleanupTestDb(ctx);
});

test('ExportService.exportAll: json形式で全メモを出力する', () => {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const exportDir = tmpExportDir();
  const exportService = new ExportService(noteStore, { exportDir });

  noteStore.create({ title: 'メモ1', body: '本文1' });

  const result = exportService.exportAll('json');
  const parsed = JSON.parse(fs.readFileSync(result.path, 'utf8'));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'メモ1');

  fs.rmSync(exportDir, { recursive: true, force: true });
  cleanupTestDb(ctx);
});

test('ExportService.exportAll: 不正なformatはValidationError', () => {
  const ctx = createTestDb();
  const noteStore = new NoteStore(ctx.db);
  const exportDir = tmpExportDir();
  const exportService = new ExportService(noteStore, { exportDir });
  assert.throws(() => exportService.exportAll('pdf'), ValidationError);
  fs.rmSync(exportDir, { recursive: true, force: true });
  cleanupTestDb(ctx);
});
