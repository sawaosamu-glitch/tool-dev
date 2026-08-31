'use strict';

const fs = require('fs');
const path = require('path');
const { renderMatches, renderSolution } = require('./svg');
const { quizMatches, solveQuiz } = require('./quiz');

const CSS_PATH = path.join(__dirname, '..', 'templates', 'pop.css');

// JIS/ISO 用紙サイズ（mm）
const PAGE_SIZES = {
  A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189],
  B4: [257, 364], B3: [364, 515], B2: [515, 728], B1: [728, 1030],
};
const MM_TO_PX = 96 / 25.4;
const PREVIEW_WIDTH_PX = 820;

function resolveSize(spec) {
  const name = String(spec).toUpperCase();
  if (PAGE_SIZES[name]) return { name, w: PAGE_SIZES[name][0], h: PAGE_SIZES[name][1] };
  const m = /^(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/.exec(name);
  if (!m) throw new Error(`unknown size: ${spec} (使用可: ${Object.keys(PAGE_SIZES).join(', ')} または 600x900)`);
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (w < 50 || h < 50 || w > 2000 || h > 2000) throw new Error(`size out of range: ${spec}`);
  return { name: `${w}x${h}`, w, h };
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * 幅ぴったりに収まる袋文字。textLength で字送りを強制するため、
 * 環境のフォントに関係なく版面からはみ出さない。
 */
function outlinedText(text, opts = {}) {
  const {
    boxW = 1000, fontSize = 200, fill = '#FFFFFF', stroke = '#241505',
    strokeWidth = 22, shadow = null, shadowDx = 10, shadowDy = 14, letterSpacing = 0,
  } = opts;
  const pad = strokeWidth * 1.2;
  const boxH = fontSize * 1.34 + Math.abs(shadowDy) + strokeWidth;
  const baseline = fontSize * 1.0 + strokeWidth * 0.6;
  const t = escapeHtml(text);
  const common =
    `x="${boxW / 2}" text-anchor="middle" textLength="${boxW - pad * 2}" ` +
    `lengthAdjust="spacingAndGlyphs" font-size="${fontSize}" font-weight="900" ` +
    `letter-spacing="${letterSpacing}" ` +
    `font-family="Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, Meiryo, sans-serif"`;
  const shadowNode = shadow
    ? `<text ${common} y="${baseline + shadowDy}" dx="${shadowDx}" fill="${shadow}" stroke="${shadow}" ` +
      `stroke-width="${strokeWidth}" paint-order="stroke">${t}</text>`
    : '';
  return (
    `<svg viewBox="0 0 ${boxW} ${boxH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t}">` +
    shadowNode +
    `<text ${common} y="${baseline}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ` +
    `paint-order="stroke" stroke-linejoin="round">${t}</text>` +
    `</svg>`
  );
}

// 探偵・謎解き風の角飾り。左に虫眼鏡、右に歯車を置く（左右非対称は意図的）。
function magnifier() {
  return (
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="42" cy="42" r="30" fill="none" stroke="#E8C468" stroke-width="9"/>' +
    '<circle cx="42" cy="42" r="30" fill="none" stroke="#0A1226" stroke-width="3"/>' +
    '<circle cx="34" cy="34" r="14" fill="#FFFFFF" opacity="0.18"/>' +
    '<line x1="64" y1="64" x2="90" y2="90" stroke="#0A1226" stroke-width="16" stroke-linecap="round"/>' +
    '<line x1="64" y1="64" x2="90" y2="90" stroke="#E8C468" stroke-width="9" stroke-linecap="round"/>' +
    '</svg>'
  );
}

function gear() {
  const teeth = 8;
  let path = '';
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * 360;
    path += `<rect x="46" y="4" width="8" height="16" fill="#E8C468" transform="rotate(${a} 50 50)"/>`;
  }
  return (
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    `${path}` +
    '<circle cx="50" cy="50" r="32" fill="#E8C468" stroke="#0A1226" stroke-width="3"/>' +
    '<circle cx="50" cy="50" r="14" fill="#0A1226"/>' +
    '</svg>'
  );
}

function stars(level) {
  const n = Math.min(3, Math.max(1, Number(level) || 1));
  return `<span class="star">${'★'.repeat(n)}</span>${'☆'.repeat(3 - n)}`;
}

function popSection(quiz, figureSvg, options = {}) {
  const { headline = '挑戦者求ム', subhead = 'Dr.マッチ棒からの挑戦状!!', footer = '正解で景品プレゼント!!' } = options;
  return (
    '<section class="pop">' +
    '<header class="band-top">' +
    `<div class="emblem left">${magnifier()}</div>` +
    `<div class="emblem right">${gear()}</div>` +
    `<div class="headline">${outlinedText(headline, {
      fontSize: 210, strokeWidth: 26, fill: '#E8C468', stroke: '#0A1226', shadow: '#4A1420',
    })}</div>` +
    `<div class="subband">${outlinedText(subhead, {
      fontSize: 130, strokeWidth: 9, fill: '#E8C468', stroke: '#0A1226', shadow: null,
    })}</div>` +
    '</header>' +
    '<main class="body">' +
    `<p class="question">${escapeHtml(quiz.question)}</p>` +
    `<div class="figure">${figureSvg}</div>` +
    `<div class="meta">No.${escapeHtml(quiz.id)}　難易度 ${stars(quiz.difficulty)}</div>` +
    '</main>' +
    `<footer class="band-bottom">${outlinedText(footer, {
      fontSize: 150, strokeWidth: 16, fill: '#FFFDF6', stroke: '#4A1420', shadow: null,
    })}</footer>` +
    '</section>'
  );
}

function renderQuizPop(quiz, options = {}) {
  return popSection(quiz, renderMatches(quizMatches(quiz)), options);
}

function printNote(size) {
  return (
    '<div class="note">' +
    '<h2>印刷のしかた（この案内は印刷されません）</h2>' +
    `<p>このページは <strong>${escapeHtml(size.name)}（${size.w}×${size.h}mm）</strong> の原寸で作られています。<br>` +
    'Chrome で <code>Ctrl/⌘ + P</code> → <strong>用紙サイズ</strong>を同じサイズに、' +
    '<strong>余白</strong>を必ず「<strong>デフォルト</strong>」に、' +
    '<strong>背景のグラフィック</strong>を<strong>ON</strong>にしてください。<br>' +
    '余白を「なし」やカスタムに変えると、Chrome は CSS の用紙指定を無視して拡大縮小します。</p>' +
    '</div>'
  );
}

function documentHtml({ title, size, sections, withNote = true }) {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const scale = Math.min(1, PREVIEW_WIDTH_PX / (size.w * MM_TO_PX));
  const frameW = Math.round(size.w * MM_TO_PX * scale);
  const frameH = Math.round(size.h * MM_TO_PX * scale);
  const frames = sections
    .map(
      (s) =>
        `<div class="frame" style="width:${frameW}px;height:${frameH}px">` +
        `<div class="scaler" style="transform:scale(${scale.toFixed(4)})">${s}</div></div>`
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
@page { size: ${size.w}mm ${size.h}mm; margin: 0; }
:root { --pw: ${size.w}mm; --ph: ${size.h}mm; }
${css}
</style>
</head>
<body>
${withNote ? printNote(size) : ''}
<div class="stage">
${frames}
</div>
</body>
</html>`;
}

/**
 * 大判（poster）を印刷可能な用紙（tile）の格子に分割する。
 * 隣り合うタイルは overlap mm だけ重ねて出力する（貼り合わせ時の目安・のりしろ）。
 * 版面がタイル用紙ぴったりの倍数でなくても、最後の行・列は poster の外側に
 * はみ出した分が白紙になるだけで欠けは生じない。
 */
function computeTileGrid(posterW, posterH, tileW, tileH, overlap) {
  if (!(overlap >= 0)) throw new Error(`tile overlap must be >= 0: ${overlap}`);
  if (tileW <= overlap || tileH <= overlap) {
    throw new Error(`tile overlap (${overlap}mm) must be smaller than the tile size (${tileW}x${tileH}mm)`);
  }
  const stepX = tileW - overlap;
  const stepY = tileH - overlap;
  const cols = posterW <= tileW ? 1 : Math.ceil((posterW - tileW) / stepX) + 1;
  const rows = posterH <= tileH ? 1 : Math.ceil((posterH - tileH) / stepY) + 1;
  return { cols, rows, stepX, stepY };
}

function tileGuideNote(size, tileSize, cols, rows, overlap) {
  const total = cols * rows;
  return (
    '<div class="note">' +
    '<h2>分割印刷のしかた（この案内は印刷されません）</h2>' +
    `<p>この版面は <strong>${escapeHtml(size.name)}（${size.w}×${size.h}mm）</strong> ですが、` +
    `<strong>${escapeHtml(tileSize.name)}（${tileSize.w}×${tileSize.h}mm）</strong> 用紙` +
    `<strong>${rows}行×${cols}列＝${total}枚</strong>に分割してあります。<br>` +
    'Chrome で <code>Ctrl/⌘ + P</code> → <strong>用紙サイズ</strong>を' +
    `<strong>${escapeHtml(tileSize.name)}</strong>に、<strong>余白</strong>を「<strong>デフォルト</strong>」に、` +
    '<strong>背景のグラフィック</strong>を<strong>ON</strong>にしてください。<br>' +
    `各シート左上の番号（行・列）を見ながら並べ、隣り合うシートどうしを` +
    `<strong>${overlap}mm重ねて</strong>貼り合わせてから、はみ出した重なり部分を切り揃えてください。</p>` +
    '</div>'
  );
}

/**
 * 1枚のposter（renderQuizPop等で作った section）を、印刷可能な用紙サイズの
 * タイル群として出力する。@page はタイル用紙で固定（全ページ同一サイズ）。
 */
function tiledDocumentHtml({ title, size, tileSize, overlap = 10, section }) {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const { cols, rows, stepX, stepY } = computeTileGrid(size.w, size.h, tileSize.w, tileSize.h, overlap);
  const total = cols * rows;
  const pages = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const n = r * cols + c + 1;
      const offX = c * stepX;
      const offY = r * stepY;
      const label = `${r + 1}行${c + 1}列（${n}/${total}）`;
      pages.push(
        `<div class="tile-page" style="width:${tileSize.w}mm;height:${tileSize.h}mm">` +
        `<div class="tile-canvas" style="left:-${offX}mm;top:-${offY}mm;width:${size.w}mm;height:${size.h}mm">${section}</div>` +
        `<div class="tile-label">${escapeHtml(label)}</div>` +
        '</div>'
      );
    }
  }
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
@page { size: ${tileSize.w}mm ${tileSize.h}mm; margin: 0; }
:root { --pw: ${size.w}mm; --ph: ${size.h}mm; }
${css}
</style>
</head>
<body>
${tileGuideNote(size, tileSize, cols, rows, overlap)}
<div class="stage">
${pages.join('\n')}
</div>
</body>
</html>`;
}

const ANSWER_SHEET_CSS = `
h1 { font-size: 22px; border-bottom: 4px solid #D8352A; padding-bottom: 8px; }
.answer { page-break-inside: avoid; break-inside: avoid; margin: 0 0 28px; }
.answer h2 { font-size: 15px; background:#FFF3D6; padding:8px 12px; border-left:6px solid #F4A81C; margin:0 0 12px; }
.ans-grid { display:flex; flex-wrap:wrap; gap:20px; align-items:flex-end; }
.ans { margin:0; }
.ans-svg { width: 210px; height: 120px; }
.ans-svg svg { width:100%; height:100%; }
.ans figcaption { text-align:center; font-size:13px; font-weight:700; margin-top:6px; }
.multi { font-size:12px; color:#A81C14; margin:8px 0 0; }
.ans-legend { font-size:13px; background:#F2F4F7; padding:10px 14px; border-radius:6px; }
`;

function answerRow(quiz) {
  const result = solveQuiz(quiz);
  const from = quizMatches(quiz);
  const figures = result.solutions
    .map(
      (s) =>
        `<figure class="ans"><div class="ans-svg">${renderSolution(from, s.matches)}</div>` +
        `<figcaption>${escapeHtml(s.label)}</figcaption></figure>`
    )
    .join('');
  const note = result.solutions.length > 1 ? `<p class="multi">解は ${result.solutions.length} 通りあります。</p>` : '';
  return (
    `<article class="answer" id="answer-${escapeHtml(quiz.id)}">` +
    `<h2>No.${escapeHtml(quiz.id)}　${escapeHtml(quiz.question.replace(/\n/g, ' '))}</h2>` +
    `<div class="ans-grid"><figure class="ans"><div class="ans-svg">${renderMatches(from)}</div>` +
    '<figcaption>問題</figcaption></figure>' +
    figures +
    `</div>${note}</article>`
  );
}

/** 解答一覧の中身（見出し・凡例・各問題のカード）。単体ページにもWeb公開版にも埋め込める。 */
function answerSectionInner(quizzes) {
  const rows = quizzes.map(answerRow).join('\n');
  return (
    '<h1>マッチ棒クイズ 解答一覧（スタッフ用）</h1>' +
    '<p class="ans-legend">緑の棒＝移動先／薄いグレー＝もとの位置。' +
    '複数解がある問題は、どれでも正解としてください。</p>' +
    rows
  );
}

function answerSheetHtml(quizzes) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>マッチ棒クイズ 解答一覧</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font-family: "Hiragino Sans","Yu Gothic","Meiryo",sans-serif; color:#241505; margin:0; padding:24px; background:#fff; }
${ANSWER_SHEET_CSS}
</style>
</head>
<body>
${answerSectionInner(quizzes)}
</body>
</html>`;
}

function indexHtml(entries, size, tileSize = null, hasWeb = false) {
  const items = entries
    .map((e) => {
      const tileLink = e.tilesFile
        ? `　<a href="${escapeHtml(e.tilesFile)}">分割印刷用（${escapeHtml(tileSize.name)}×複数枚）</a>`
        : '';
      return `<li><a href="${escapeHtml(e.file)}">${escapeHtml(e.id)}</a>　${escapeHtml(e.question)}${tileLink}</li>`;
    })
    .join('\n');
  const tileMeta = tileSize
    ? `<p class="meta">分割印刷: ${escapeHtml(tileSize.name)}（${tileSize.w}×${tileSize.h}mm）用紙に分割した版も各POPに用意しています。</p>`
    : '';
  const webLink = hasWeb ? '　|　<a href="web.html">Web公開用の1ページ版</a>' : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>マッチ棒クイズPOP 一覧</title>
<style>
body { font-family:"Hiragino Sans","Yu Gothic","Meiryo",sans-serif; max-width:760px; margin:40px auto; padding:0 20px; color:#241505; line-height:1.9; }
h1 { border-bottom:4px solid #D8352A; padding-bottom:8px; }
li { margin-bottom:6px; }
a { color:#A8500C; font-weight:700; }
.meta { color:#666; font-size:14px; }
</style>
</head>
<body>
<h1>マッチ棒クイズPOP</h1>
<p class="meta">用紙サイズ: ${escapeHtml(size.name)}（${size.w}×${size.h}mm）／全 ${entries.length} 枚</p>
${tileMeta}
<ul>
${items}
</ul>
<p><a href="all.html">全ページまとめて印刷</a>　|　<a href="answers.html">解答一覧（スタッフ用）</a>${webLink}</p>
</body>
</html>`;
}

const WEB_CSS = `
:root { --web-bg:#3A3F4B; --web-card:#22262F; }
* { box-sizing: border-box; }
body { margin:0; background:var(--web-bg); font-family:"Hiragino Sans","Yu Gothic","Meiryo",sans-serif; color:#1B1206; }
.web-nav {
  position: sticky; top: 0; z-index: 10; display:flex; flex-wrap:wrap; gap:8px;
  padding: 14px 20px; background: var(--web-card); box-shadow: 0 2px 10px rgba(0,0,0,0.4);
}
.web-nav a { color:#E8C468; text-decoration:none; font-size:13px; font-weight:700; padding:4px 10px; border:1px solid #E8C468; border-radius:999px; }
.web-nav a:hover { background:#E8C468; color:#0A1226; }
.web-intro { max-width: 760px; margin: 24px auto 0; padding: 0 20px; color:#EDEBE3; font-size:14px; line-height:1.9; text-align:center; }
.web-section { max-width: 900px; margin: 0 auto; padding: 28px 20px 8px; scroll-margin-top: 64px; }
.web-frame {
  width: 100%; position: relative; overflow: hidden; border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4); background:#fff;
}
.web-answers { max-width: 900px; margin: 24px auto 60px; background:#FFFDF6; padding: 24px 28px; border-radius: 10px; }
`;

const FIT_FRAMES_SCRIPT = `
(function () {
  function fit() {
    document.querySelectorAll('.web-frame[data-pw]').forEach(function (frame) {
      var pw = Number(frame.dataset.pw);
      var ph = Number(frame.dataset.ph);
      var scale = frame.clientWidth / pw;
      frame.style.height = Math.round(ph * scale) + 'px';
      var scaler = frame.querySelector('.scaler');
      if (scaler) scaler.style.transform = 'scale(' + scale + ')';
    });
  }
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', fit);
  window.addEventListener('load', fit);
})();
`;

/**
 * Web公開用の1ページ版の中身（style/nav/各POP/解答一覧）。
 * <!DOCTYPE>/<html>/<head>/<body> は含まない — CLI用の webPageHtml と、
 * それ以外の場所（例: 静的ホスティング用に別途包む場合）の両方から使い回せるようにするため。
 */
function webContent({ size, quizzes }) {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const scale = Math.min(1, PREVIEW_WIDTH_PX / (size.w * MM_TO_PX));
  const pwPx = Math.round(size.w * MM_TO_PX * scale);
  const phPx = Math.round(size.h * MM_TO_PX * scale);

  const nav = quizzes.map((q) => `<a href="#quiz-${escapeHtml(q.id)}">${escapeHtml(q.id)}</a>`).join('\n');
  const sections = quizzes
    .map(
      (q) =>
        `<section class="web-section" id="quiz-${escapeHtml(q.id)}">` +
        `<div class="web-frame" data-pw="${pwPx}" data-ph="${phPx}" style="max-width:${pwPx}px">` +
        `<div class="scaler" style="transform-origin:top left">${renderQuizPop(q)}</div>` +
        '</div></section>'
    )
    .join('\n');

  return (
    '<title>マッチ棒クイズPOP</title>\n' +
    `<style>:root { --pw: ${pwPx}px; --ph: ${phPx}px; }\n${css}\n${WEB_CSS}</style>\n` +
    '<nav class="web-nav">\n' + nav + '\n</nav>\n' +
    '<p class="web-intro">画面の幅に合わせて表示しています。印刷する場合は、各POPを開いて' +
    ' ⌘/Ctrl+P から用紙サイズ・余白「デフォルト」・背景のグラフィックONで出力してください。</p>\n' +
    sections + '\n' +
    `<div class="web-answers">${answerSectionInner(quizzes)}</div>\n` +
    `<script>${FIT_FRAMES_SCRIPT}</script>`
  );
}

function webPageHtml({ title, size, quizzes }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body>
${webContent({ size, quizzes })}
</body>
</html>`;
}

module.exports = {
  PAGE_SIZES, MM_TO_PX, PREVIEW_WIDTH_PX,
  resolveSize, escapeHtml, outlinedText, magnifier, gear, stars,
  renderQuizPop, documentHtml, answerSheetHtml, indexHtml,
  computeTileGrid, tiledDocumentHtml, webContent, webPageHtml,
};
