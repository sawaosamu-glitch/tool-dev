const express = require('express');

const MAX_QUESTION_LENGTH = 1000;

function createAskRouter(qaService) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const question = req.body && req.body.question;
    if (typeof question !== 'string' || question.length < 1 || question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ error: `質問は1〜${MAX_QUESTION_LENGTH}文字で入力してください` });
    }
    try {
      const result = await qaService.ask(question);
      res.json(result);
    } catch (err) {
      console.error('[ask]', err);
      res.status(500).json({ error: '質問応答に失敗しました' });
    }
  });

  return router;
}

module.exports = { createAskRouter, MAX_QUESTION_LENGTH };
