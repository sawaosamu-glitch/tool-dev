'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadQuizzes, solveQuiz, validateQuiz, quizMatches } = require('../../src/lib/quiz');

const DATA = path.join(__dirname, '..', '..', 'data', 'quizzes.json');

// TC-I01 出題する全問題が「指定本数でちょうど解ける」ことを保証する
test('data/quizzes.json の全問題がソルバーで成立する', () => {
  const quizzes = loadQuizzes(DATA);
  assert.ok(quizzes.length >= 8, '問題数が想定より少ない');
  for (const q of quizzes) {
    const r = solveQuiz(q);
    assert.strictEqual(r.ok, true, `${q.id}: ${r.reason}`);
    assert.ok(r.solutions.length >= 1, `${q.id}: 解がない`);
    assert.deepStrictEqual(r.easier, [], `${q.id}: 指定より少ない本数で解けてしまう`);
  }
});

// TC-I02
test('解はどれもマッチ棒の総数を変えない', () => {
  for (const q of loadQuizzes(DATA)) {
    const n = quizMatches(q).length;
    for (const s of solveQuiz(q).solutions) {
      assert.strictEqual(s.matches.length, n, `${q.id} の解で本数が変わっている`);
    }
  }
});

// TC-I03
test('写真と同じ2問が収録されている', () => {
  const quizzes = loadQuizzes(DATA);
  const eq = quizzes.find((q) => q.id === 'EQ-001');
  const sq = quizzes.find((q) => q.id === 'SQ-001');
  assert.strictEqual(eq.expr, '6+9=7');
  assert.strictEqual(eq.moves, 2);
  assert.strictEqual(sq.goalSquares, 3);
  assert.strictEqual(sq.moves, 2);
  assert.deepStrictEqual(solveQuiz(eq).solutions.map((s) => s.label), ['6-3=3']);
});

// TC-I04
test('スキーマ違反は具体的なメッセージで弾く', () => {
  assert.throws(() => validateQuiz({ id: 'bad', type: 'equation', moves: 1, question: 'q', expr: '1+1=3' }), /id must match/);
  assert.throws(() => validateQuiz({ id: 'EQ-001', type: 'x', moves: 1, question: 'q' }), /type must be/);
  assert.throws(() => validateQuiz({ id: 'EQ-001', type: 'equation', moves: 9, question: 'q', expr: '1+1=3' }), /moves must be/);
  assert.throws(() => validateQuiz({ id: 'EQ-001', type: 'equation', moves: 1, question: '', expr: '1+1=3' }), /question is required/);
  assert.throws(() => validateQuiz({ id: 'EQ-001', type: 'equation', moves: 1, question: 'q', expr: '1+1' }), /must contain "="/);
});

// TC-I05 「すでに正しい式」「すでに目標の個数」はクイズとして成立しない
test('成立しない問題は ok=false と理由を返す', () => {
  const already = { id: 'EQ-900', type: 'equation', moves: 1, difficulty: 1, question: 'q', expr: '1+2=3' };
  assert.strictEqual(solveQuiz(already).reason, 'source-already-correct');

  const noSol = { id: 'EQ-901', type: 'equation', moves: 1, difficulty: 1, question: 'q', expr: '1+1=8' };
  const r = solveQuiz(noSol);
  assert.strictEqual(r.ok, false);
  assert.ok(['no-solution', 'solvable-with-fewer-moves'].includes(r.reason));
});
