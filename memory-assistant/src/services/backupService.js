const fs = require('node:fs');
const path = require('node:path');

const KEEP_GENERATIONS = 7;
const WARNING_FAILURE_THRESHOLD = 2;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

// C-05 BackupService（SDD 1章）: 起動時/定期/終了時バックアップ、世代管理（直近7世代保持）
// HARNESS.md H9: 連続失敗回数を追跡しUI警告バナーの表示判定に使う
class BackupService {
  constructor(db, { backupDir }) {
    this.db = db;
    this.backupDir = backupDir;
    this.consecutiveFailureCount = 0;
  }

  async runBackup() {
    const filePath = path.join(this.backupDir, `backup_${timestamp()}.db`);
    try {
      fs.mkdirSync(this.backupDir, { recursive: true });
      await this.db.backup(filePath);
      this.consecutiveFailureCount = 0;
      this.pruneOldBackups();
      return { path: filePath, timestamp: timestamp() };
    } catch (err) {
      this.consecutiveFailureCount += 1;
      console.error(`[BackupService] バックアップに失敗しました: ${err.message}`);
      return { path: null, error: err.message };
    }
  }

  pruneOldBackups(keep = KEEP_GENERATIONS) {
    try {
      const files = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
        .sort()
        .reverse();
      const toDelete = files.slice(keep);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(this.backupDir, f));
      }
      return toDelete.length;
    } catch {
      return 0;
    }
  }

  getConsecutiveFailureCount() {
    return this.consecutiveFailureCount;
  }

  isWarning() {
    return this.consecutiveFailureCount >= WARNING_FAILURE_THRESHOLD;
  }
}

module.exports = { BackupService, KEEP_GENERATIONS, WARNING_FAILURE_THRESHOLD };
