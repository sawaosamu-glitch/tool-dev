const express = require('express');
const { ValidationError } = require('../errors');

function createSearchRouter(searchService) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const q = req.query.q;
    if (typeof q !== 'string' || q.length === 0) {
      return res.status(400).json({ error: 'クエリパラメータqを指定してください' });
    }
    try {
      const results = searchService.search(q);
      res.json({ results });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
      } else {
        console.error('[search]', err);
        res.status(500).json({ error: '検索に失敗しました' });
      }
    }
  });

  return router;
}

module.exports = { createSearchRouter };
