const fs = require('node:fs');
const path = require('node:path');

// SRS 11章 監査ログ（Should）: 操作種別・対象メモID・操作日時のみ記録し、本文等の個人データは含めない（CC-02, C-DATA-005）
const LOG_DIR = process.env.MEMORY_ASSISTANT_LOG_DIR || path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

function logNoteOperation(action, noteId) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = `${new Date().toISOString()} [audit] action=${action} noteId=${noteId}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (err) {
    // 監査ログの失敗はアプリ本体の動作を妨げない（Should要件のため）
    console.warn(`[logger] 監査ログの書き込みに失敗しました: ${err.message}`);
  }
}

module.exports = { logNoteOperation };
