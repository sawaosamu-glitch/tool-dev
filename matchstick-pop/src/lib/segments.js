'use strict';

const { key, translate } = require('./matches');

// 7セグメント（1桁 = 幅2 x 高さ4 half-unit）
//   a
// f   b
//   g
// e   c
//   d
const SEGMENT_KEYS = {
  a: key('h', 0, 0),
  b: key('v', 2, 0),
  c: key('v', 2, 2),
  d: key('h', 0, 4),
  e: key('v', 0, 2),
  f: key('v', 0, 0),
  g: key('h', 0, 2),
};

const DIGIT_SEGMENTS = {
  0: 'abcdef',
  1: 'bc',
  2: 'abged',
  3: 'abgcd',
  4: 'fgbc',
  5: 'afgcd',
  6: 'afgedc',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
};

// 演算子も同じ 幅2 x 高さ4 のセルに収める
const OPERATOR_KEYS = {
  '+': [key('h', 0, 2), key('v', 1, 1)],
  '-': [key('h', 0, 2)],
  '=': [key('h', 0, 1), key('h', 0, 3)],
};

const SLOT_W = 2;
const SLOT_GAP = 2;
const SLOT_PITCH = SLOT_W + SLOT_GAP;

function digitMatches(d) {
  const segs = DIGIT_SEGMENTS[String(d)];
  if (!segs) throw new Error(`invalid digit: ${d}`);
  return [...segs].map((s) => SEGMENT_KEYS[s]);
}

function operatorMatches(op) {
  const ks = OPERATOR_KEYS[op];
  if (!ks) throw new Error(`invalid operator: ${op}`);
  return ks.slice();
}

function slotMatches(ch) {
  return /^[0-9]$/.test(ch) ? digitMatches(ch) : operatorMatches(ch);
}

function slotStickCount(ch) {
  return slotMatches(ch).length;
}

// "6+9=7" → 各スロットを絶対座標に展開したマッチ棒キー配列
function expressionMatches(expr) {
  const chars = [...expr];
  const out = [];
  chars.forEach((ch, i) => {
    out.push(...translate(slotMatches(ch), i * SLOT_PITCH, 0));
  });
  const seen = new Set();
  for (const k of out) {
    if (seen.has(k)) throw new Error(`overlapping matches in expression: ${expr}`);
    seen.add(k);
  }
  return out;
}

function expressionWidth(expr) {
  return [...expr].length * SLOT_PITCH - SLOT_GAP;
}

module.exports = {
  SEGMENT_KEYS,
  DIGIT_SEGMENTS,
  OPERATOR_KEYS,
  SLOT_W,
  SLOT_GAP,
  SLOT_PITCH,
  digitMatches,
  operatorMatches,
  slotMatches,
  slotStickCount,
  expressionMatches,
  expressionWidth,
};
