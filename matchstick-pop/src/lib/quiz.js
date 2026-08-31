'use strict';

const fs = require('fs');
const { expressionMatches } = require('./segments');
const { solveEquation, isCorrectEquation } = require('./equation-solver');
const { solveSquares, countSquares } = require('./squares-solver');

const TYPES = new Set(['equation', 'squares']);

function fail(id, msg) {
  throw new Error(`quiz ${id || '(no id)'}: ${msg}`);
}

function validateQuiz(q) {
  if (!q || typeof q !== 'object') throw new Error('quiz must be an object');
  if (typeof q.id !== 'string' || !/^[A-Z]{2}-\d{3}$/.test(q.id)) {
    fail(q.id, 'id must match /^[A-Z]{2}-\\d{3}$/ (例: EQ-001)');
  }
  if (!TYPES.has(q.type)) fail(q.id, `type must be one of ${[...TYPES].join('|')}`);
  if (!Number.isInteger(q.moves) || q.moves < 1 || q.moves > 3) fail(q.id, 'moves must be 1..3');
  if (typeof q.question !== 'string' || q.question.trim() === '') fail(q.id, 'question is required');

  if (q.type === 'equation') {
    if (typeof q.expr !== 'string' || !/^[0-9+\-=]+$/.test(q.expr)) fail(q.id, 'expr must contain only 0-9 + - =');
    if (!q.expr.includes('=')) fail(q.id, 'expr must contain "="');
  } else {
    if (!Array.isArray(q.start) || q.start.length === 0) fail(q.id, 'start must be a non-empty array');
    if (new Set(q.start).size !== q.start.length) fail(q.id, 'start contains duplicate matches');
    if (!Number.isInteger(q.w) || !Number.isInteger(q.h) || q.w < 1 || q.h < 1) fail(q.id, 'w/h must be positive integers');
    if (!Number.isInteger(q.goalSquares) || q.goalSquares < 1) fail(q.id, 'goalSquares must be a positive integer');
  }
  return q;
}

function quizMatches(q) {
  return q.type === 'equation' ? expressionMatches(q.expr) : q.start.slice();
}

function solveQuiz(q) {
  validateQuiz(q);
  const allowLeftover = q.allowLeftover === true;

  if (q.type === 'equation') {
    if (isCorrectEquation(q.expr)) {
      return { ok: false, reason: 'source-already-correct', solutions: [], easier: [] };
    }
    const easier = [];
    for (let k = 1; k < q.moves; k += 1) {
      if (solveEquation(q.expr, k).length > 0) easier.push(k);
    }
    const solutions = solveEquation(q.expr, q.moves).map((s) => ({
      label: s.expr,
      matches: expressionMatches(s.expr),
    }));
    return {
      ok: solutions.length > 0 && easier.length === 0,
      reason: solutions.length === 0 ? 'no-solution' : easier.length ? 'solvable-with-fewer-moves' : 'ok',
      solutions,
      easier,
    };
  }

  const opts = { goalSquares: q.goalSquares, w: q.w, h: q.h, allowLeftover };
  const startSquares = countSquares(q.start, q.w, q.h);
  if (startSquares === q.goalSquares) {
    return { ok: false, reason: 'start-already-goal', solutions: [], easier: [], startSquares };
  }
  const easier = [];
  for (let k = 1; k < q.moves; k += 1) {
    if (solveSquares(q.start, { ...opts, moves: k }).length > 0) easier.push(k);
  }
  const solutions = solveSquares(q.start, { ...opts, moves: q.moves }).map((s) => ({
    label: `${q.goalSquares}コの四角`,
    matches: s.matches,
  }));
  return {
    ok: solutions.length > 0 && easier.length === 0,
    reason: solutions.length === 0 ? 'no-solution' : easier.length ? 'solvable-with-fewer-moves' : 'ok',
    solutions,
    easier,
    startSquares,
  };
}

function loadQuizzes(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!raw || !Array.isArray(raw.quizzes)) throw new Error(`${file}: "quizzes" array is required`);
  const ids = new Set();
  for (const q of raw.quizzes) {
    validateQuiz(q);
    if (ids.has(q.id)) fail(q.id, 'duplicate id');
    ids.add(q.id);
  }
  return raw.quizzes;
}

module.exports = { TYPES, validateQuiz, quizMatches, solveQuiz, loadQuizzes };
