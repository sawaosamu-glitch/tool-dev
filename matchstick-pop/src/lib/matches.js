'use strict';

// 座標系: 1マッチ棒の長さ = 2 half-unit。全座標は整数の half-unit。
// マッチ棒は "h:x:y"（(x,y)から右へ長さ2）または "v:x:y"（(x,y)から下へ長さ2）。
const MATCH_LEN = 2;

const KEY_RE = /^([hv]):(-?\d+):(-?\d+)$/;

function key(dir, x, y) {
  if (dir !== 'h' && dir !== 'v') throw new Error(`invalid dir: ${dir}`);
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`coordinates must be integers: ${x},${y}`);
  }
  return `${dir}:${x}:${y}`;
}

function parseKey(k) {
  const m = KEY_RE.exec(k);
  if (!m) throw new Error(`invalid match key: ${k}`);
  return { dir: m[1], x: Number(m[2]), y: Number(m[3]) };
}

function endpoints(k) {
  const { dir, x, y } = parseKey(k);
  return dir === 'h'
    ? { x1: x, y1: y, x2: x + MATCH_LEN, y2: y }
    : { x1: x, y1: y, x2: x, y2: y + MATCH_LEN };
}

function translate(keys, dx, dy) {
  return keys.map((k) => {
    const { dir, x, y } = parseKey(k);
    return key(dir, x + dx, y + dy);
  });
}

function bbox(keys) {
  if (keys.length === 0) throw new Error('bbox of empty match set');
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of keys) {
    const { x1, y1, x2, y2 } = endpoints(k);
    minX = Math.min(minX, x1); minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// 差集合のサイズ = 動かした本数（本数が等しい前提）
function moveCount(fromKeys, toKeys) {
  const from = new Set(fromKeys);
  const to = new Set(toKeys);
  if (from.size !== fromKeys.length) throw new Error('duplicate match in source');
  if (to.size !== toKeys.length) throw new Error('duplicate match in target');
  if (from.size !== to.size) return null; // 本数が変わる = 「移動」では到達不能
  let removed = 0;
  for (const k of from) if (!to.has(k)) removed += 1;
  return removed;
}

module.exports = { MATCH_LEN, key, parseKey, endpoints, translate, bbox, moveCount };
