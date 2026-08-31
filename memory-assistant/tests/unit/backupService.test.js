const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { BackupService } = require('../../src/services/backupService');
const { createTestDb, cleanupTestDb } = require('../fixtures/testDb');

function tmpBackupDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-assistant-backup-'));
}

// TC-UNIT-11: FR-SYS-005 自動バックアップ
test('BackupService.runBackup: バックアップファイルを生成する', async () => {
  const ctx = createTestDb();
  const backupDir = tmpBackupDir();
  const backupService = new BackupService(ctx.db, { backupDir });

  const result = await backupService.runBackup();
  assert.ok(result.path);
  assert.ok(fs.existsSync(result.path));
  assert.equal(backupService.getConsecutiveFailureCount(), 0);

  fs.rmSync(backupDir, { recursive: true, force: true });
  cleanupTestDb(ctx);
});

test('BackupService.pruneOldBackups: 直近7世代のみ保持する', async () => {
  const ctx = createTestDb();
  const backupDir = tmpBackupDir();
  const backupService = new BackupService(ctx.db, { backupDir });

  // 10世代分のダミーファイルを作成（ファイル名の辞書順=時系列順になるようずらす）
  for (let i = 0; i < 10; i++) {
    fs.writeFileSync(path.join(backupDir, `backup_2026083102${String(i).padStart(2, '0')}00.db`), 'dummy');
  }
  const deleted = backupService.pruneOldBackups(7);
  const remaining = fs.readdirSync(backupDir);
  assert.equal(deleted, 3);
  assert.equal(remaining.length, 7);

  fs.rmSync(backupDir, { recursive: true, force: true });
  cleanupTestDb(ctx);
});

// HARNESS.md H9: 連続失敗回数の可視化
test('BackupService: 書き込み不可なディレクトリへのバックアップは失敗回数をカウントする', async () => {
  const ctx = createTestDb();
  // 存在しない親を持つ読み取り専用相当のパスにして書き込み失敗を誘発
  const invalidDir = '/this/path/should/not/be/writable/for/tests';
  const backupService = new BackupService(ctx.db, { backupDir: invalidDir });

  const result1 = await backupService.runBackup();
  assert.equal(result1.path, null);
  assert.equal(backupService.getConsecutiveFailureCount(), 1);
  assert.equal(backupService.isWarning(), false);

  const result2 = await backupService.runBackup();
  assert.equal(result2.path, null);
  assert.equal(backupService.getConsecutiveFailureCount(), 2);
  assert.equal(backupService.isWarning(), true);

  cleanupTestDb(ctx);
});
