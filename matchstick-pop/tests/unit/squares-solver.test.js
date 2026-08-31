'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { countSquares, findSquares, leftoverMatches, latticePositions, solveSquares } = require('../../src/lib/squares-solver');

const UNIT_SQUARE = ['h:0:0', 'h:0:2', 'v:0:0', 'v:2:0'];
const GRID_2X2 = [
  'h:0:0', 'h:2:0', 'h:0:2', 'h:2:2', 'h:0:4', 'h:2:4',
  'v:0:0', 'v:2:0', 'v:4:0', 'v:0:2', 'v:2:2', 'v:4:2',
];
// 写真のクイズ: 四角1コ + 四角1コ + はみ出した2本
const SQ001 = ['h:0:0', 'h:0:2', 'v:0:0', 'v:2:0', 'h:4:0', 'h:4:2', 'v:4:0', 'v:6:0', 'h:6:0', 'h:6:2'];

// TC-U30
test('正方形の数え上げ: 単体・2x2格子（大きい正方形も数える）', () => {
  assert.strictEqual(countSquares(UNIT_SQUARE, 1, 1), 1);
  assert.strictEqual(countSquares(GRID_2X2, 2, 2), 5); // 1x1が4 + 2x2が1
  assert.strictEqual(findSquares(GRID_2X2, 2, 2).filter((s) => s.size === 2).length, 1);
});

// TC-U31
test('辺が1本でも欠けていれば正方形として数えない', () => {
  assert.strictEqual(countSquares(UNIT_SQUARE.slice(0, 3), 1, 1), 0);
});

// TC-U32
test('どの正方形にも属さないマッチ棒を余り棒として検出する', () => {
  assert.deepStrictEqual(leftoverMatches(SQ001, 4, 2).sort(), ['h:6:0', 'h:6:2']);
  assert.deepStrictEqual(leftoverMatches(UNIT_SQUARE, 1, 1), []);
});

// TC-U33 写真のクイズ: 2本移動で四角3コ、解は1通り
test('SQ-001 は2本移動で四角3コになり、解は1通り', () => {
  assert.strictEqual(countSquares(SQ001, 4, 2), 2);
  const sols = solveSquares(SQ001, { moves: 2, goalSquares: 3, w: 4, h: 2 });
  assert.strictEqual(sols.length, 1);
  assert.strictEqual(countSquares(sols[0].matches, 4, 2), 3);
  assert.strictEqual(sols[0].matches.length, SQ001.length, 'マッチ棒の総数が変わっている');
});

// TC-U34 「2本」と銘打つ以上、1本では解けてはいけない
test('SQ-001 は1本移動では解けない', () => {
  assert.strictEqual(solveSquares(SQ001, { moves: 1, goalSquares: 3, w: 4, h: 2 }).length, 0);
});

// TC-U35
test('余り棒を許さない設定では、余りが残る配置を解にしない', () => {
  for (const sol of solveSquares(SQ001, { moves: 2, goalSquares: 3, w: 4, h: 2 })) {
    assert.deepStrictEqual(leftoverMatches(sol.matches, 4, 2), []);
  }
});

// TC-U36
test('物理的に不可能な問題は解0件として返す（6本で四角2コは不可能）', () => {
  const six = [...UNIT_SQUARE, 'h:2:0', 'h:2:2'];
  assert.strictEqual(solveSquares(six, { moves: 1, goalSquares: 2, w: 4, h: 2 }).length, 0);
  assert.strictEqual(solveSquares(six, { moves: 2, goalSquares: 2, w: 4, h: 2 }).length, 0);
});

// TC-U37
test('格子の外にあるマッチ棒は拒否する', () => {
  assert.throws(() => solveSquares(['h:20:0'], { moves: 1, goalSquares: 1, w: 2, h: 2 }), /outside grid/);
});

// TC-U38
test('格子位置の総数は (w x (h+1)) + ((w+1) x h)', () => {
  assert.strictEqual(latticePositions(4, 2).length, 4 * 3 + 5 * 2);
});
