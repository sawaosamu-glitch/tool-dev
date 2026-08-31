const path = require('node:path');
const express = require('express');

const { createNotesRouter } = require('./routes/notes');
const { createSearchRouter } = require('./routes/search');
const { createAskRouter } = require('./routes/ask');
const { createMiscRouter } = require('./routes/misc');

// C-08 WebServer本体の組み立て。listen()や起動シーケンス（DB初期化・バックアップ・Ollama検出）は
// server.js側の責務とし、ここではExpressアプリの構築のみを行う（テスト容易性のため分離）。
function createApp({ noteStore, searchService, qaService, backupService, exportService, getOllamaAvailable }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/api/notes', createNotesRouter(noteStore));
  app.use('/api/search', createSearchRouter(searchService));
  app.use('/api/ask', createAskRouter(qaService));
  app.use('/api', createMiscRouter({ getOllamaAvailable, backupService, exportService }));
  return app;
}

module.exports = { createApp };
