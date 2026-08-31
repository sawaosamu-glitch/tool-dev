'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { evaluateExpression, isCorrectEquation, solveEquation } = require('../../src/lib/equation-solver');

// TC-U20
test('式の評価: 正しい式と誤った式を判別する', () => {
  assert.strictEqual(isCorrectEquation('1+2=3'), true);
  assert.strictEqual(isCorrectEquation('6+9=7'), false);
  assert.strictEqual(isCorrectEquation('9-7=2'), true);
});

// TC-U21
test('多桁と左から順の計算に対応する', () => {
  assert.strictEqual(isCorrectEquation('12+3=15'), true);
  assert.strictEqual(isCorrectEquation('9-5+1=5'), true);
});

// TC-U22
test('先頭0の多桁数と構文エラーは不正な式として扱う', () => {
  assert.deepStrictEqual(evaluateExpression('01+2=3').valid, false);
  assert.deepStrictEqual(evaluateExpression('1+2=3=4').valid, false);
  assert.deepStrictEqual(evaluateExpression('1++2=3').valid, false);
  assert.strictEqual(evaluateExpression('0+2=2').valid, true);
});

// TC-U23 写真のクイズ: 2本移動で唯一解 6-3=3
test('6+9=7 は2本移動で 6-3=3 のみが解になる', () => {
  const sols = solveEquation('6+9=7', 2);
  assert.deepStrictEqual(sols.map((s) => s.expr), ['6-3=3']);
});

// TC-U24 「2本」と銘打つ以上、1本では解けてはいけない
test('6+9=7 は1本移動では解けない', () => {
  assert.strictEqual(solveEquation('6+9=7', 1).length, 0);
});

// TC-U25
test('解のマッチ棒本数は元の式と等しい（移動であって追加ではない）', () => {
  const { expressionMatches } = require('../../src/lib/segments');
  for (const sol of solveEquation('8+3=5', 1)) {
    assert.strictEqual(expressionMatches(sol.expr).length, expressionMatches('8+3=5').length);
  }
});

// TC-U26
test('探索空間が大きすぎる場合は明示的に失敗する', () => {
  assert.throws(() => solveEquation('1234567+1234567=1234567', 1), /search space too large/);
});

// TC-U27
test('moves は正の整数のみ受け付ける', () => {
  assert.throws(() => solveEquation('1+1=3', 0), /positive integer/);
  assert.throws(() => solveEquation('1+1=3', 1.5), /positive integer/);
});
