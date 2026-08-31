const express = require('express');
const { ValidationError, NotFoundError } = require('../errors');

// C-08 WebServer（SDD 1章）: /api/notes 系ルーティング。入力バリデーションはここで実施（CC-04）
function createNotesRouter(noteStore) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { tag, page } = req.query;
    const pageNum = Number.parseInt(page, 10) || 1;
    const notes = noteStore.findAll({ tag: tag || undefined, page: pageNum });
    res.json({ notes });
  });

  router.post('/', (req, res) => {
    try {
      const note = noteStore.create(req.body || {});
      res.status(201).json({ note });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
      } else {
        console.error('[notes.create]', err);
        res.status(500).json({ error: '保存に失敗しました' });
      }
    }
  });

  router.put('/:id', (req, res) => {
    try {
      const note = noteStore.update(Number(req.params.id), req.body || {});
      res.json({ note });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
      } else if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
      } else {
        console.error('[notes.update]', err);
        res.status(500).json({ error: '更新に失敗しました' });
      }
    }
  });

  // HARNESS.md H1: 削除は確認フラグ(confirm:true)必須（ブラウザ確認ダイアログと合わせた二重防御）
  router.delete('/:id', (req, res) => {
    if (!req.body || req.body.confirm !== true) {
      return res.status(400).json({ error: '削除には確認フラグ(confirm:true)が必要です' });
    }
    const deleted = noteStore.delete(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'メモが見つかりません' });
    }
    res.status(204).end();
  });

  return router;
}

module.exports = { createNotesRouter };
