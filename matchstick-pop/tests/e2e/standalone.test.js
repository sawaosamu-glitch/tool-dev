'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(ROOT, 'scripts', 'build-standalone.js');
const OUT_PATH = path.join(ROOT, 'dist', 'match.html');

function build() {
  execFileSync(process.execPath, [BUILD_SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  return fs.readFileSync(OUT_PATH, 'utf8');
}

function extractScriptBlocks(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

// TC-S01 正常系: ビルドが成功し、単一の自己完結HTMLになる
test('S-01 match.html がビルドでき、外部リソース参照を持たない自己完結HTMLである', () => {
  const html = build();
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  // 埋め込んだJSソース中には documentHtml 等が返す文字列リテラルとして
  // "<html" が複数含まれる（それ自体はprint用ページを生成するコードの一部で正常）。
  // ここでは「外側の文書としてちょうど1つのhtml要素が開く」ことだけを確認する。
  assert.strictEqual((html.match(/^<html /m) || []).length, 1);
  assert.ok(!/https?:\/\//.test(html.replace(/http:\/\/www\.w3\.org[^"']*/g, '')), '外部URLへの参照がある');
  assert.ok(!html.includes('@import'));
  assert.ok(!/\burl\(/.test(html.replace(/url\(#/g, '')), '外部リソースへのurl()参照がある（SVGのローカル参照は除く）');
});

// TC-S02 正常系: 埋め込んだ2つの<script>ブロックが構文エラーなく評価できる
test('S-02 埋め込まれたスクリプトが構文エラーなく評価できる（</script文字列の混入対策）', () => {
  const html = build();
  const blocks = extractScriptBlocks(html);
  assert.strictEqual(blocks.length, 2, 'スクリプトブロックの数が想定と違う（</scriptの誤混入で分割された疑いがある）');
  for (const [i, block] of blocks.entries()) {
    assert.doesNotThrow(() => new Function(block), `block ${i} が構文エラー`);
  }
});

// TC-S03 正常系: 埋め込みロジックが本家のNodeモジュールと同じ結果を返す（ロジックの二重化・劣化がないことの保証）
test('S-03 埋め込みロジックが src/lib/* の実装と一致する', () => {
  const html = build();
  const [libSrc] = extractScriptBlocks(html);
  const exported = new Function(
    libSrc +
      '\nreturn { resolveSize, solveEquation, quizMatches, solveQuiz, renderQuizPop, EMBEDDED_QUIZZES, documentHtml, webPageHtml, answerSheetHtml, tiledDocumentHtml };'
  )();

  const realEquationSolver = require(path.join(ROOT, 'src/lib/equation-solver'));
  const realQuiz = require(path.join(ROOT, 'src/lib/quiz'));
  const realPop = require(path.join(ROOT, 'src/lib/pop'));
  const realQuizzes = realQuiz.loadQuizzes(path.join(ROOT, 'data/quizzes.json'));

  assert.strictEqual(exported.EMBEDDED_QUIZZES.length, realQuizzes.length);
  assert.deepStrictEqual(exported.solveEquation('6+9=7', 2), realEquationSolver.solveEquation('6+9=7', 2));
  assert.deepStrictEqual(exported.resolveSize('A3'), realPop.resolveSize('A3'));

  for (const q of exported.EMBEDDED_QUIZZES) {
    const real = realQuizzes.find((r) => r.id === q.id);
    assert.strictEqual(exported.renderQuizPop(q), realPop.renderQuizPop(real), `${q.id} の描画結果が本家と食い違う`);
    assert.deepStrictEqual(exported.solveQuiz(q).ok, realQuiz.solveQuiz(real).ok, `${q.id} の検証結果が本家と食い違う`);
  }
});

// TC-S04 正常系: 生成できるドキュメント（印刷用・Web公開用・解答一覧）が壊れていない
test('S-04 生成される印刷用/Web公開用/解答一覧のHTMLにNaN・undefinedが混入しない', () => {
  const html = build();
  const [libSrc] = extractScriptBlocks(html);
  const lib = new Function(
    libSrc +
      '\nreturn { resolveSize, renderQuizPop, EMBEDDED_QUIZZES, documentHtml, webPageHtml, answerSheetHtml };'
  )();
  const size = lib.resolveSize('A3');
  const all = lib.documentHtml({ title: 't', size, sections: lib.EMBEDDED_QUIZZES.map(lib.renderQuizPop) });
  const web = lib.webPageHtml({ title: 't', size, quizzes: lib.EMBEDDED_QUIZZES });
  const answers = lib.answerSheetHtml(lib.EMBEDDED_QUIZZES);
  for (const doc of [all, web, answers]) {
    assert.ok(!doc.includes('NaN'));
    assert.ok(!doc.includes('undefined'));
  }
  assert.strictEqual((all.match(/class="pop"/g) || []).length, lib.EMBEDDED_QUIZZES.length);
});

// TC-S05 境界系: どのlib/*.jsにも fetch/XHR/WebSocket など外部通信を行うコードが含まれない
test('S-05 埋め込みスクリプトに外部通信APIの呼び出しがない', () => {
  const html = build();
  const [libSrc, appSrc] = extractScriptBlocks(html);
  for (const src of [libSrc, appSrc]) {
    assert.ok(!/\bfetch\s*\(/.test(src));
    assert.ok(!/XMLHttpRequest/.test(src));
    assert.ok(!/WebSocket/.test(src));
  }
});
