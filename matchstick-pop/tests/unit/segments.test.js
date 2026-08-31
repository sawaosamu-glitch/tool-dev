'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { digitMatches, operatorMatches, expressionMatches, expressionWidth, DIGIT_SEGMENTS } = require('../../src/lib/segments');

const STICK_COUNT = { 0: 6, 1: 2, 2: 5, 3: 5, 4: 4, 5: 5, 6: 6, 7: 3, 8: 7, 9: 6 };

// TC-U10
test('各数字のマッチ棒本数が7セグメントの定義と一致する', () => {
  for (const [d, n] of Object.entries(STICK_COUNT)) {
    assert.strictEqual(digitMatches(d).length, n, `digit ${d}`);
    assert.strictEqual(new Set(DIGIT_SEGMENTS[d]).size, n, `digit ${d} のセグメント定義に重複がある`);
  }
});

// TC-U11
test('演算子の本数: + は2本 / - は1本 / = は2本', () => {
  assert.strictEqual(operatorMatches('+').length, 2);
  assert.strictEqual(operatorMatches('-').length, 1);
  assert.strictEqual(operatorMatches('=').length, 2);
  assert.throws(() => operatorMatches('*'), /invalid operator/);
});

// TC-U12
test('式全体の本数は各スロットの合計になる', () => {
  // 6(6) + +(2) + 9(6) + =(2) + 7(3) = 19
  assert.strictEqual(expressionMatches('6+9=7').length, 19);
  assert.strictEqual(new Set(expressionMatches('6+9=7')).size, 19, 'マッチ棒が重なっている');
});

// TC-U13
test('スロットは重ならない間隔で並ぶ', () => {
  assert.strictEqual(expressionWidth('6+9=7'), 5 * 4 - 2);
  for (const expr of ['0+0=0', '8-8=8', '1+1=1']) {
    const ks = expressionMatches(expr);
    assert.strictEqual(new Set(ks).size, ks.length, `${expr} で重複`);
  }
});

// TC-U14
test('不正な文字を含む式は拒否する', () => {
  assert.throws(() => expressionMatches('6*9=7'), /invalid operator/);
});
