'use strict';

const { expressionMatches } = require('./segments');
const { moveCount } = require('./matches');

const MAX_COMBINATIONS = 2_000_000;

// "12+3=15" を評価。等号は1つだけ、左辺は + / - の左から順の計算。
// 多桁数の先頭0（"01"）は不正な式として扱う。
function evaluateExpression(expr) {
  const sides = expr.split('=');
  if (sides.length !== 2) return { valid: false, reason: 'equals-count' };

  const parseSide = (s) => {
    if (!/^[0-9]+([+-][0-9]+)*$/.test(s)) return null;
    const nums = s.split(/[+-]/);
    if (nums.some((n) => n.length > 1 && n.startsWith('0'))) return null;
    let total = Number(nums[0]);
    let idx = nums[0].length;
    for (let i = 1; i < nums.length; i += 1) {
      const op = s[idx];
      total = op === '+' ? total + Number(nums[i]) : total - Number(nums[i]);
      idx += 1 + nums[i].length;
    }
    return total;
  };

  const left = parseSide(sides[0]);
  const right = parseSide(sides[1]);
  if (left === null || right === null) return { valid: false, reason: 'syntax' };
  return { valid: true, correct: left === right, left, right };
}

function isCorrectEquation(expr) {
  const r = evaluateExpression(expr);
  return r.valid && r.correct;
}

function slotCandidates(ch) {
  if (/^[0-9]$/.test(ch)) return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  if (ch === '+' || ch === '-') return ['+', '-'];
  if (ch === '=') return ['='];
  throw new Error(`unsupported character in expression: ${ch}`);
}

// ちょうど moves 本を動かして正しい式にできる解を全列挙する。
// スロット数・配置は固定（マッチ棒の総数が変わらない範囲でのみ探索）。
function solveEquation(expr, moves) {
  if (!Number.isInteger(moves) || moves < 1) throw new Error('moves must be a positive integer');
  const chars = [...expr];
  const candidates = chars.map(slotCandidates);
  const total = candidates.reduce((acc, c) => acc * c.length, 1);
  if (total > MAX_COMBINATIONS) {
    throw new Error(`search space too large: ${total} combinations`);
  }

  const source = expressionMatches(expr);
  const solutions = [];
  const buf = new Array(chars.length);

  const walk = (i) => {
    if (i === chars.length) {
      const target = buf.join('');
      if (target === expr) return;
      if (!isCorrectEquation(target)) return;
      const n = moveCount(source, expressionMatches(target));
      if (n === moves) solutions.push({ expr: target, moves: n });
      return;
    }
    for (const ch of candidates[i]) {
      buf[i] = ch;
      walk(i + 1);
    }
  };
  walk(0);

  solutions.sort((a, b) => (a.expr < b.expr ? -1 : 1));
  return solutions;
}

module.exports = {
  MAX_COMBINATIONS,
  evaluateExpression,
  isCorrectEquation,
  slotCandidates,
  solveEquation,
};
