'use strict';

const { key, parseKey } = require('./matches');

const MAX_SEARCH = 5_000_000;

// 格子は「セル単位」で扱う。セル境界は half-unit で 2 刻み。
function latticePositions(w, h) {
  const out = [];
  for (let y = 0; y <= h; y += 1) for (let x = 0; x < w; x += 1) out.push(key('h', x * 2, y * 2));
  for (let y = 0; y < h; y += 1) for (let x = 0; x <= w; x += 1) out.push(key('v', x * 2, y * 2));
  return out;
}

function edgeKeysOfSquare(x, y, size) {
  const ks = [];
  for (let i = 0; i < size; i += 1) {
    ks.push(key('h', (x + i) * 2, y * 2));
    ks.push(key('h', (x + i) * 2, (y + size) * 2));
    ks.push(key('v', x * 2, (y + i) * 2));
    ks.push(key('v', (x + size) * 2, (y + i) * 2));
  }
  return ks;
}

// 任意サイズの軸平行な正方形を全て数える
function findSquares(keys, w, h) {
  const set = new Set(keys);
  const found = [];
  for (let size = 1; size <= Math.min(w, h); size += 1) {
    for (let y = 0; y + size <= h; y += 1) {
      for (let x = 0; x + size <= w; x += 1) {
        const edges = edgeKeysOfSquare(x, y, size);
        if (edges.every((k) => set.has(k))) found.push({ x, y, size, edges });
      }
    }
  }
  return found;
}

function countSquares(keys, w, h) {
  return findSquares(keys, w, h).length;
}

// どの正方形の辺にもなっていないマッチ棒（余り棒）
function leftoverMatches(keys, w, h) {
  const used = new Set();
  for (const sq of findSquares(keys, w, h)) for (const k of sq.edges) used.add(k);
  return keys.filter((k) => !used.has(k));
}

function* combinations(arr, k) {
  const idx = [];
  const rec = function* (start) {
    if (idx.length === k) { yield idx.map((i) => arr[i]); return; }
    for (let i = start; i < arr.length; i += 1) {
      idx.push(i);
      yield* rec(i + 1);
      idx.pop();
    }
  };
  yield* rec(0);
}

function withinBounds(k, w, h) {
  const { dir, x, y } = parseKey(k);
  if (x % 2 !== 0 || y % 2 !== 0) return false;
  const cx = x / 2;
  const cy = y / 2;
  return dir === 'h'
    ? cx >= 0 && cx < w && cy >= 0 && cy <= h
    : cx >= 0 && cx <= w && cy >= 0 && cy < h;
}

/**
 * ちょうど moves 本動かして正方形が goalSquares 個になる解を全列挙する。
 * allowLeftover=false なら、解の状態で余り棒が1本もないものだけを解とする。
 */
function solveSquares(startKeys, options) {
  const { moves, goalSquares, w, h, allowLeftover = false } = options;
  if (!Number.isInteger(moves) || moves < 1) throw new Error('moves must be a positive integer');
  for (const k of startKeys) {
    if (!withinBounds(k, w, h)) throw new Error(`match outside grid ${w}x${h}: ${k}`);
  }

  const all = latticePositions(w, h);
  const startSet = new Set(startKeys);
  const free = all.filter((k) => !startSet.has(k));

  const nRemove = [...combinations(startKeys, moves)];
  const nAdd = [...combinations(free, moves)];
  if (nRemove.length * nAdd.length > MAX_SEARCH) {
    throw new Error(`search space too large: ${nRemove.length * nAdd.length}`);
  }

  const solutions = [];
  for (const removed of nRemove) {
    const kept = startKeys.filter((k) => !removed.includes(k));
    for (const added of nAdd) {
      const next = kept.concat(added);
      if (countSquares(next, w, h) !== goalSquares) continue;
      if (!allowLeftover && leftoverMatches(next, w, h).length > 0) continue;
      solutions.push({ removed: removed.slice(), added: added.slice(), matches: next.slice().sort() });
    }
  }
  return solutions;
}

module.exports = {
  MAX_SEARCH,
  latticePositions,
  edgeKeysOfSquare,
  findSquares,
  countSquares,
  leftoverMatches,
  withinBounds,
  solveSquares,
};
