'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { key, parseKey, endpoints, translate, bbox, moveCount } = require('../../src/lib/matches');

// TC-U01
test('key/parseKey は往復する', () => {
  assert.strictEqual(key('h', 4, -2), 'h:4:-2');
  assert.deepStrictEqual(parseKey('v:0:6'), { dir: 'v', x: 0, y: 6 });
});

// TC-U02
test('整数以外の座標と不正な向きは拒否する', () => {
  assert.throws(() => key('h', 0.5, 0), /integers/);
  assert.throws(() => key('d', 0, 0), /invalid dir/);
  assert.throws(() => parseKey('h:0'), /invalid match key/);
});

// TC-U03
test('マッチ棒の長さは常に2 half-unit', () => {
  assert.deepStrictEqual(endpoints('h:2:4'), { x1: 2, y1: 4, x2: 4, y2: 4 });
  assert.deepStrictEqual(endpoints('v:2:4'), { x1: 2, y1: 4, x2: 2, y2: 6 });
});

// TC-U04
test('translate は全マッチ棒を平行移動する', () => {
  assert.deepStrictEqual(translate(['h:0:0', 'v:2:0'], 4, 1), ['h:4:1', 'v:6:1']);
});

// TC-U05
test('bbox は端点を含む外接矩形を返す', () => {
  assert.deepStrictEqual(bbox(['h:0:0', 'v:2:0']), { minX: 0, minY: 0, maxX: 2, maxY: 2, w: 2, h: 2 });
  assert.throws(() => bbox([]), /empty/);
});

// TC-U06
test('moveCount は本数が同じときだけ移動本数を返す', () => {
  assert.strictEqual(moveCount(['h:0:0', 'v:0:0'], ['h:0:0', 'v:2:0']), 1);
  assert.strictEqual(moveCount(['h:0:0'], ['h:0:0', 'v:0:0']), null);
  assert.strictEqual(moveCount(['h:0:0', 'v:0:0'], ['h:0:0', 'v:0:0']), 0);
});

// TC-U07
test('重複したマッチ棒は不正として弾く', () => {
  assert.throws(() => moveCount(['h:0:0', 'h:0:0'], ['h:0:0', 'v:0:0']), /duplicate/);
});
