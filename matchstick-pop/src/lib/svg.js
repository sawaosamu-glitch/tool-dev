'use strict';

const { parseKey, bbox, MATCH_LEN } = require('./matches');

const DEFAULTS = {
  unit: 40,          // half-unit あたりの px（マッチ棒1本 = unit * 2）
  padding: 0.6,      // half-unit 単位の余白
  stick: '#B4763C',
  stickEdge: '#7A4A20',
  head: '#D8352A',
  headEdge: '#9C1F16',
  ghost: '#C9CDD4',
  added: '#1E8E4E',
};

const round = (n) => Math.round(n * 1000) / 1000;

function stickGeometry(k, unit) {
  const { dir, x, y } = parseKey(k);
  const len = MATCH_LEN * unit;
  const thick = unit * 0.30;
  const px = x * unit;
  const py = y * unit;
  return dir === 'h'
    ? { x: px, y: py - thick / 2, w: len, h: thick, hx: px + len - thick * 0.55, hy: py }
    : { x: px - thick / 2, y: py, w: thick, h: len, hx: px, hy: py + len - thick * 0.55 };
}

function stickSvg(k, unit, colors) {
  const g = stickGeometry(k, unit);
  const thick = unit * 0.30;
  const r = thick * 0.72;
  return (
    `<rect x="${round(g.x)}" y="${round(g.y)}" width="${round(g.w)}" height="${round(g.h)}" ` +
    `rx="${round(thick / 2)}" fill="${colors.stick}" stroke="${colors.stickEdge}" stroke-width="${round(unit * 0.045)}"/>` +
    `<circle cx="${round(g.hx)}" cy="${round(g.hy)}" r="${round(r)}" ` +
    `fill="${colors.head}" stroke="${colors.headEdge}" stroke-width="${round(unit * 0.045)}"/>`
  );
}

function svgWrap(inner, box, unit, padding, extraAttrs = '') {
  const pad = padding * unit;
  const x = round(box.minX * unit - pad);
  const y = round(box.minY * unit - pad);
  const w = round(box.w * unit + pad * 2);
  const h = round(box.h * unit + pad * 2);
  return (
    `<svg viewBox="${x} ${y} ${w} ${h}" xmlns="http://www.w3.org/2000/svg" ` +
    `preserveAspectRatio="xMidYMid meet" role="img"${extraAttrs}>${inner}</svg>`
  );
}

function renderMatches(keys, options = {}) {
  if (!Array.isArray(keys) || keys.length === 0) throw new Error('renderMatches: empty match list');
  const o = { ...DEFAULTS, ...options };
  const box = bbox(keys);
  const inner = keys.map((k) => stickSvg(k, o.unit, o)).join('');
  return svgWrap(inner, box, o.unit, o.padding);
}

// 解答図: 元の位置に残る棒は通常色、動かした先は強調、抜いた位置は薄いゴースト。
function renderSolution(fromKeys, toKeys, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const from = new Set(fromKeys);
  const to = new Set(toKeys);
  const removed = fromKeys.filter((k) => !to.has(k));
  const kept = toKeys.filter((k) => from.has(k));
  const added = toKeys.filter((k) => !from.has(k));

  const box = bbox([...new Set([...fromKeys, ...toKeys])]);
  const ghostColors = { stick: o.ghost, stickEdge: o.ghost, head: o.ghost, headEdge: o.ghost };
  const addedColors = { ...o, stick: '#3FA96B', stickEdge: '#1E8E4E', head: o.head, headEdge: o.headEdge };

  const inner =
    removed.map((k) => `<g opacity="0.45">${stickSvg(k, o.unit, ghostColors)}</g>`).join('') +
    kept.map((k) => stickSvg(k, o.unit, o)).join('') +
    added.map((k) => stickSvg(k, o.unit, addedColors)).join('');

  return svgWrap(inner, box, o.unit, o.padding);
}

module.exports = { DEFAULTS, stickGeometry, renderMatches, renderSolution };
