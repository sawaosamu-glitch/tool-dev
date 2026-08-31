'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { renderMatches, renderSolution } = require('../../src/lib/svg');
const {
  resolveSize, escapeHtml, outlinedText, documentHtml, renderQuizPop,
  computeTileGrid, tiledDocumentHtml, webContent, webPageHtml,
} = require('../../src/lib/pop');
const { loadQuizzes } = require('../../src/lib/quiz');
const path = require('path');

const QUIZZES = loadQuizzes(path.join(__dirname, '..', '..', 'data', 'quizzes.json'));

const SQUARE = ['h:0:0', 'h:0:2', 'v:0:0', 'v:2:0'];

// TC-U40
test('SVGは1本につき棒1つと頭1つを描く', () => {
  const svg = renderMatches(SQUARE);
  assert.match(svg, /^<svg /);
  assert.strictEqual((svg.match(/<rect /g) || []).length, SQUARE.length);
  assert.strictEqual((svg.match(/<circle /g) || []).length, SQUARE.length);
});

// TC-U41 数値が壊れると印刷物が無言で崩れるため、NaN混入を検出する
test('SVGに NaN / undefined が混入しない', () => {
  for (const svg of [renderMatches(SQUARE), renderSolution(SQUARE, ['h:0:0', 'h:0:2', 'v:0:0', 'v:4:0'])]) {
    assert.ok(!svg.includes('NaN'), 'NaN が含まれる');
    assert.ok(!svg.includes('undefined'), 'undefined が含まれる');
  }
});

// TC-U42
test('空のマッチ棒配列は描画せずエラーにする', () => {
  assert.throws(() => renderMatches([]), /empty/);
});

// TC-U43
test('解答図は 元の位置・残る棒・移動先 をすべて含む', () => {
  const to = ['h:0:0', 'h:0:2', 'v:0:0', 'v:4:0'];
  const svg = renderSolution(SQUARE, to);
  // 抜いた1本 + 残る3本 + 足した1本 = 5本ぶん描画される
  assert.strictEqual((svg.match(/<rect /g) || []).length, 5);
});

// TC-U44
test('用紙サイズの解決: 規格名とカスタム指定', () => {
  assert.deepStrictEqual(resolveSize('A3'), { name: 'A3', w: 297, h: 420 });
  assert.deepStrictEqual(resolveSize('b2'), { name: 'B2', w: 515, h: 728 });
  assert.deepStrictEqual(resolveSize('600x900'), { name: '600x900', w: 600, h: 900 });
  assert.throws(() => resolveSize('A9'), /unknown size/);
  assert.throws(() => resolveSize('10x10'), /out of range/);
});

// TC-U45 問題データは外部ファイル。HTML/SVGへの注入を防ぐ。
test('問題文のHTML特殊文字はエスケープされる', () => {
  assert.strictEqual(escapeHtml('<script>&"'), '&lt;script&gt;&amp;&quot;');
  const svg = outlinedText('<img src=x onerror=alert(1)>');
  assert.ok(!svg.includes('<img'), 'SVGにタグがそのまま入っている');
  assert.ok(svg.includes('&lt;img'));

  const quiz = { id: 'EQ-001', type: 'equation', moves: 1, difficulty: 1, question: '<b>x</b>', expr: '8+3=5' };
  const html = renderQuizPop(quiz);
  assert.ok(!html.includes('<b>x</b>'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
});

// TC-U46
test('@page とページ寸法が指定サイズと一致する', () => {
  const size = resolveSize('A1');
  const html = documentHtml({ title: 't', size, sections: ['<section class="pop"></section>'] });
  assert.ok(html.includes('@page { size: 594mm 841mm; margin: 0; }'));
  assert.ok(html.includes('--pw: 594mm'));
  assert.ok(html.includes('--ph: 841mm'));
});

// TC-U47 サイズ可変の要。寸法以外の見た目は同一であること。
test('A4とA1で寸法だけが変わり、版面の構造は同じ', () => {
  const s = ['<section class="pop">x</section>'];
  const a4 = documentHtml({ title: 't', size: resolveSize('A4'), sections: s, withNote: false });
  const a1 = documentHtml({ title: 't', size: resolveSize('A1'), sections: s, withNote: false });
  assert.notStrictEqual(a4, a1);
  const strip = (h) => h.replace(/\d+(\.\d+)?mm/g, 'MM').replace(/scale\([\d.]+\)/, 'S').replace(/width:\d+px;height:\d+px/, 'WH');
  assert.strictEqual(strip(a4), strip(a1));
});

// TC-U48 分割印刷の格子計算。A0をA3で割ると、のりしろ込みで3行×3列になる。
test('タイル格子: A0をA3(のりしろ10mm)で割ると3行3列になる', () => {
  const grid = computeTileGrid(841, 1189, 297, 420, 10);
  assert.deepStrictEqual(grid, { cols: 3, rows: 3, stepX: 287, stepY: 410 });
});

// TC-U48b 版面がタイル用紙以下なら1行1列（分割不要）
test('タイル格子: 版面がタイル用紙以下なら1行1列になる', () => {
  const grid = computeTileGrid(210, 297, 297, 420, 10);
  assert.deepStrictEqual(grid, { cols: 1, rows: 1, stepX: 287, stepY: 410 });
});

// TC-U49 のりしろがタイル寸法以上、または負のときは拒否する
test('タイル格子: 不正なのりしろは拒否する', () => {
  assert.throws(() => computeTileGrid(841, 1189, 297, 420, -1), /must be >= 0/);
  assert.throws(() => computeTileGrid(841, 1189, 297, 420, 297), /must be smaller than the tile size/);
});

// TC-U50 分割印刷の出力: @pageはタイル用紙、--pw/--phは版面全体、タイル数だけpage要素がある
test('分割印刷ドキュメント: @pageはタイル寸法、--pw/--phは版面寸法、タイル数が一致する', () => {
  const size = resolveSize('A0');
  const tileSize = resolveSize('A3');
  const html = tiledDocumentHtml({ title: 't', size, tileSize, overlap: 10, section: '<section class="pop">x</section>' });
  assert.ok(html.includes('@page { size: 297mm 420mm; margin: 0; }'));
  assert.ok(html.includes('--pw: 841mm'));
  assert.ok(html.includes('--ph: 1189mm'));
  assert.strictEqual((html.match(/class="tile-page"/g) || []).length, 9);
  assert.ok(html.includes('1行1列（1/9）'));
  assert.ok(html.includes('3行3列（9/9）'));
});

// TC-U51 Web公開版: 全問題へのアンカーリンクと解答セクションを含む
test('webContent は全問題のナビリンクと各セクション・解答一覧を含む', () => {
  const size = resolveSize('A3');
  const content = webContent({ size, quizzes: QUIZZES });
  for (const q of QUIZZES) {
    assert.ok(content.includes(`href="#quiz-${q.id}"`), `${q.id} のナビリンクがない`);
    assert.ok(content.includes(`id="quiz-${q.id}"`), `${q.id} のセクションIDがない`);
  }
  assert.ok(content.includes('解答一覧'));
  assert.ok(content.includes('--pw: ') && content.includes('--ph: '), '--pw/--ph が定義されていない');
});

// TC-U52 数値計算が壊れて図が崩れることを防ぐ（web版でも同じ規律を適用）
test('webContent / webPageHtml に NaN・undefined が混入しない', () => {
  const size = resolveSize('A3');
  const content = webContent({ size, quizzes: QUIZZES });
  const full = webPageHtml({ title: 't', size, quizzes: QUIZZES });
  for (const html of [content, full]) {
    assert.ok(!html.includes('NaN'));
    assert.ok(!html.includes('undefined'));
  }
});

// TC-U53 webPageHtml は完全な文書、webContent は中身だけ（Doctype/html/head/bodyを含まない）
test('webPageHtml は完全な文書、webContent は本文断片のみを返す', () => {
  const size = resolveSize('A3');
  const full = webPageHtml({ title: 'マッチ棒クイズPOP', size, quizzes: QUIZZES });
  const content = webContent({ size, quizzes: QUIZZES });
  assert.ok(full.startsWith('<!DOCTYPE html>'));
  assert.ok(full.includes('<html'));
  assert.ok(full.includes('<body>'));
  assert.ok(!content.includes('<!DOCTYPE'));
  assert.ok(!content.includes('<html'));
  assert.ok(!content.includes('<body>'));
  assert.ok(full.includes(content), 'webPageHtml が webContent をそのまま埋め込んでいない');
});

// TC-U54 セキュリティ: 問題文はエスケープされる（web公開時に外部の目に触れるため特に重要）
test('webContent でも問題文はエスケープされる', () => {
  const size = resolveSize('A3');
  const evil = { id: 'EQ-999', type: 'equation', moves: 1, difficulty: 1, question: '<script>alert(1)</script>', expr: '8+3=5' };
  const content = webContent({ size, quizzes: [evil] });
  assert.ok(!content.includes('<script>alert(1)</script>'));
  assert.ok(content.includes('&lt;script&gt;'));
});
