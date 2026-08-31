const path = require('node:path');
const express = require('express');

const config = require('./config');
const { openDatabase } = require('./db/migrate');
const { createApp } = require('./app');
const { NoteStore } = require('./services/noteStore');
const { SearchService } = require('./services/searchService');
const { QAService } = require('./services/qaService');
const { BackupService } = require('./services/backupService');
const { ExportService } = require('./services/exportService');
const { OllamaAdapter } = require('./adapters/ollamaAdapter');

// パスは環境変数で上書き可能（既定はプロジェクト直下）。E2Eテストでの実プロセス起動時に
// data/backups/exportsを本番ディレクトリと分離するために使う（CONSTRAINTS C-DATA-006準拠）。
const DATA_DIR = process.env.MEMORY_ASSISTANT_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'memory-assistant.db');
const BACKUP_DIR = process.env.MEMORY_ASSISTANT_BACKUP_DIR || path.join(__dirname, '..', 'backups');
const EXPORT_DIR = process.env.MEMORY_ASSISTANT_EXPORT_DIR || path.join(__dirname, '..', 'exports');
const HOST = '127.0.0.1'; // ADR-004: 外部端末からの接続を遮断するためlocalhostのみバインド

function startErrorServer(port, integrityError) {
  const app = express();
  app.use((req, res) => {
    res.status(500).send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>memory-assistant — 起動エラー</title></head>
<body style="font-family: sans-serif; max-width: 640px; margin: 40px auto; line-height: 1.6;">
<h1>データベースに問題があります</h1>
<p>整合性チェックに失敗しました。README.md の「データが壊れた・消えたときの復元手順」に従って復元してください。</p>
<p>アプリを終了し、data フォルダの .db-wal / .db-shm を削除したうえで、backups フォルダの最新ファイルを data/memory-assistant.db として復元し、再起動してください。</p>
</body></html>`);
  });
  app.listen(port, HOST, () => {
    console.error(`[server] DB整合性チェック失敗のためエラーページのみ提供中: http://${HOST}:${port}`);
    console.error(`[server] 詳細: ${integrityError.message}`);
  });
}

async function main() {
  const cfg = config.load(process.env.MEMORY_ASSISTANT_CONFIG_PATH || undefined);

  let db;
  try {
    db = openDatabase(DB_PATH);
  } catch (err) {
    if (err.code === 'DB_INTEGRITY_FAILED') {
      startErrorServer(cfg.port, err);
      return;
    }
    throw err;
  }

  const noteStore = new NoteStore(db);
  const searchService = new SearchService(db);
  const backupService = new BackupService(db, { backupDir: BACKUP_DIR });
  const exportService = new ExportService(noteStore, { exportDir: EXPORT_DIR });
  const ollamaAdapter = new OllamaAdapter({ model: cfg.ollamaModel });

  // 起動時バックアップ（FR-SYS-005 (a)）
  await backupService.runBackup();

  // Ollama検出（FR-EXT-001）: セッション中キャッシュし毎回の質問では再チェックしない
  let ollamaAvailable = await ollamaAdapter.healthCheck();

  const qaService = new QAService({
    searchService,
    ollamaAdapter,
    get ollamaAvailable() {
      return ollamaAvailable;
    },
  });

  const app = createApp({
    noteStore,
    searchService,
    qaService,
    backupService,
    exportService,
    getOllamaAvailable: () => ollamaAvailable,
  });

  const server = app.listen(cfg.port, HOST, () => {
    console.log(`[server] memory-assistant is running at http://${HOST}:${cfg.port}`);
  });

  // FR-SYS-005 (b): 定期バックアップ
  const backupTimer = setInterval(
    () => backupService.runBackup(),
    cfg.backupIntervalHours * 60 * 60 * 1000
  );
  backupTimer.unref();

  // HARNESS.md H4: キルスイッチ。終了シグナルで終了時バックアップ後にプロセス終了
  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('[server] シャットダウン中... 終了時バックアップを実行します');
    await backupService.runBackup();
    server.close(() => {
      db.close();
      process.exit(0);
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { app, server, db, ollamaAdapterRef: ollamaAdapter };
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[server] 起動に失敗しました:', err);
    process.exit(1);
  });
}

module.exports = { main };
