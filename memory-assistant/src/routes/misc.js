const express = require('express');
const { ValidationError } = require('../errors');

// FR-EXT-001の状態表示・FR-SYS-005例外(H9警告バナー)・FR-DATA-006を1ルーターにまとめる
function createMiscRouter({ getOllamaAvailable, backupService, exportService }) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    res.json({
      ollamaAvailable: getOllamaAvailable(),
      backupWarning: backupService.isWarning(),
    });
  });

  router.post('/export', (req, res) => {
    try {
      const { format } = req.body || {};
      const result = exportService.exportAll(format);
      res.json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
      } else {
        console.error('[export]', err);
        res.status(500).json({ error: 'エクスポートに失敗しました' });
      }
    }
  });

  return router;
}

module.exports = { createMiscRouter };
