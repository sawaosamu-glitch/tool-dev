#!/usr/bin/env node
'use strict';

/**
 * dist/match.html を作る。Node/npmなしでダブルクリックするだけで動く、
 * 完全に自己完結した1ファイル版（GUIサーバーと同じ機能をブラウザ内だけで再現する）。
 *
 * 方針: src/lib/*.js のロジックを二重管理しない。各ファイルから
 * require/module.exports の行だけを機械的に取り除いてそのまま連結する
 * （関数の中身は一切書き換えない）。CSSファイル読込（fs.readFileSync）だけは
 * ビルド時に読み込んだ文字列へ置き換える。問題データも同様にJSONを埋め込む。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(ROOT, 'src', 'lib');
const CSS_PATH = path.join(ROOT, 'src', 'templates', 'pop.css');
const DATA_PATH = path.join(ROOT, 'data', 'quizzes.json');
const OUT_PATH = path.join(ROOT, 'dist', 'match.html');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/**
 * CommonJSモジュールをブラウザの1スクリプト内で使える形に変換する。
 * - 'use strict' 行を消す
 * - require(...) の行を消す（依存先は同じ<script>内で先に連結されるので不要）
 * - `cutAt` で指定した文字列以降（通常は module.exports、quiz.jsだけ loadQuizzes）を切り捨てる
 */
function stripModule(src, cutAt = 'module.exports') {
  let out = src.replace(/^'use strict';\s*\n+/, '');
  out = out.replace(/^const\s+.*=\s*require\([^)]*\);\s*$/gm, '');
  const idx = out.indexOf(cutAt);
  if (idx === -1) throw new Error(`cut marker "${cutAt}" not found`);
  return out.slice(0, idx).trim();
}

function buildLibraryScript() {
  const matches = stripModule(read(path.join(LIB, 'matches.js')));
  const segments = stripModule(read(path.join(LIB, 'segments.js')));
  const equationSolver = stripModule(read(path.join(LIB, 'equation-solver.js')));
  const squaresSolver = stripModule(read(path.join(LIB, 'squares-solver.js')));
  const svg = stripModule(read(path.join(LIB, 'svg.js')));
  const quiz = stripModule(read(path.join(LIB, 'quiz.js')), 'function loadQuizzes');

  let pop = read(path.join(LIB, 'pop.js'));
  pop = pop.replace(/^const CSS_PATH = .*$/m, '');
  pop = pop.replace(/fs\.readFileSync\(CSS_PATH,\s*'utf8'\)/g, 'POP_CSS');
  pop = stripModule(pop);

  const cssText = read(CSS_PATH);
  const quizzesJson = JSON.parse(read(DATA_PATH));

  return [
    '"use strict";',
    `const POP_CSS = ${JSON.stringify(cssText)};`,
    `const EMBEDDED_QUIZZES = ${JSON.stringify(quizzesJson.quizzes, null, 0)};`,
    '// ---- src/lib/matches.js ----',
    matches,
    '// ---- src/lib/segments.js ----',
    segments,
    '// ---- src/lib/equation-solver.js ----',
    equationSolver,
    '// ---- src/lib/squares-solver.js ----',
    squaresSolver,
    '// ---- src/lib/svg.js ----',
    svg,
    '// ---- src/lib/quiz.js (loadQuizzes を除く。データはEMBEDDED_QUIZZESで埋め込み済み) ----',
    quiz,
    '// ---- src/lib/pop.js (CSS読込をPOP_CSSに差し替え) ----',
    pop,
  ].join('\n\n');
}

/**
 * インラインの<script>タグ内にJS文字列として"</script"が含まれると、
 * HTMLパーサーはJS構文を理解しないため、そこでタグが終わったと誤認して
 * 残りのスクリプトを本文として扱ってしまう。バックスラッシュを挟んでも
 * JS上の意味（ただのスラッシュ）は変わらないため、安全にエスケープできる。
 */
function escapeScriptClose(js) {
  return js.replace(/<\/script/gi, '<\\/script');
}

function main() {
  const libraryScript = escapeScriptClose(buildLibraryScript());
  const appScript = escapeScriptClose(read(path.join(__dirname, 'standalone-app.js')));
  const appCss = read(path.join(__dirname, 'standalone-app.css'));
  const bodyHtml = read(path.join(__dirname, 'standalone-body.html'));

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>マッチ棒クイズPOP ジェネレーター（ローカル版）</title>
<style>
${appCss}
</style>
</head>
<body>
${bodyHtml}
<script>
${libraryScript}
</script>
<script>
${appScript}
</script>
</body>
</html>
`;

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, html, 'utf8');
  process.stdout.write(`書き出しました: ${OUT_PATH} (${(html.length / 1024).toFixed(1)} KB)\n`);
}

if (require.main === module) {
  main();
}

module.exports = { buildLibraryScript, stripModule, main, OUT_PATH };
