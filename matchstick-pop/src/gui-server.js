#!/usr/bin/env node
'use strict';

/**
 * ローカル専用の生成画面。外部ネットワークには一切アクセスせず、
 * 127.0.0.1 だけで待ち受ける。使い方は README「画面から生成する（GUI）」参照。
 * 依存パッケージは追加していない（Node標準の http/fs/path/querystring のみ）。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const { loadQuizzes } = require('./lib/quiz');
const { PAGE_SIZES, escapeHtml } = require('./lib/pop');
const { build } = require('./index');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4949;
const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'quizzes.json');
const OUT_DIR = path.join(ROOT, 'dist', 'gui-output');

const SIZE_NAMES = Object.keys(PAGE_SIZES);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

function sizeOptions(selected) {
  const opts = SIZE_NAMES.map((n) => {
    const [w, h] = PAGE_SIZES[n];
    return `<option value="${n}"${n === selected ? ' selected' : ''}>${n}（${w}×${h}mm）</option>`;
  });
  opts.push(`<option value="CUSTOM"${selected === 'CUSTOM' ? ' selected' : ''}>カスタム（mmで指定）</option>`);
  return opts.join('\n');
}

function pageShell(title, body) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { --navy-1:#1B2A55; --navy-2:#101B3A; --navy-3:#0A1226; --gold:#E8C468; --gold-dark:#A9791F; --maroon:#7A2230; --ink:#1B1206; --paper:#FFFDF6; }
* { box-sizing: border-box; }
body { margin:0; padding:32px 16px 64px; background:#3A3F4B; color:var(--ink); font-family:"Hiragino Sans","Yu Gothic","Meiryo",sans-serif; }
.card { max-width: 720px; margin: 0 auto; background: var(--paper); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); overflow: hidden; }
.card h1 { margin:0; padding:20px 28px; background:linear-gradient(180deg,var(--navy-1),var(--navy-3)); color:var(--gold); font-size:20px; border-bottom:4px solid var(--gold); }
.card .content { padding: 24px 28px 32px; }
fieldset { border: 1px solid #D8CDB0; border-radius: 8px; margin: 0 0 20px; padding: 14px 16px; }
legend { padding: 0 8px; font-weight: 700; color: var(--navy-1); }
label.row { display:flex; align-items:center; gap:8px; padding:4px 0; font-size:14px; }
.quiz-list { max-height: 220px; overflow-y: auto; border: 1px solid #E8E0CC; border-radius: 6px; padding: 8px 12px; background: #fff; }
.quiz-list label { display:block; font-size: 13px; padding: 3px 0; }
select, input[type=number] { font-size: 14px; padding: 4px 8px; border: 1px solid #C9BE9E; border-radius: 4px; }
.inline { display:flex; gap:16px; flex-wrap:wrap; align-items:center; }
.custom-size { display:flex; gap:8px; align-items:center; margin-top:8px; }
.custom-size input { width: 90px; }
button.toggle { font-size:12px; padding:2px 10px; border:1px solid var(--navy-1); background:#fff; color:var(--navy-1); border-radius:4px; cursor:pointer; }
button.submit { display:block; width:100%; padding:14px; margin-top:8px; background:var(--maroon); color:var(--paper); font-size:16px; font-weight:700; border:none; border-radius:8px; cursor:pointer; }
button.submit:hover { filter: brightness(1.08); }
.hint { font-size: 12px; color: #6b6250; margin: 4px 0 0; }
.error { background:#FBE4E4; border-left:6px solid #B4342A; padding:14px 18px; border-radius:6px; white-space:pre-wrap; font-size:14px; margin-bottom:20px; }
.success { background:#E6F3E6; border-left:6px solid #2E7D32; padding:14px 18px; border-radius:6px; font-size:14px; margin-bottom:20px; }
a.back { color: var(--navy-1); font-weight:700; }
a.button-link { display:inline-block; margin: 4px 8px 4px 0; padding:8px 14px; background:var(--navy-1); color:#fff; border-radius:6px; text-decoration:none; font-size:14px; }
ul.result-list { padding-left: 18px; }
ul.result-list li { margin-bottom: 6px; }
</style>
</head>
<body>
<div class="card">
<h1>マッチ棒クイズPOP ジェネレーター</h1>
<div class="content">
${body}
</div>
</div>
<script>
function toggleCustom(presetId, boxId) {
  var v = document.getElementById(presetId).value;
  document.getElementById(boxId).style.display = (v === 'CUSTOM') ? 'flex' : 'none';
}
function toggleTile() {
  document.getElementById('tile-options').style.display = document.getElementById('tileEnabled').checked ? 'block' : 'none';
}
function setAllQuizzes(checked) {
  document.querySelectorAll('.quiz-list input[type=checkbox]').forEach(function (c) { c.checked = checked; });
}
</script>
</body>
</html>`;
}

function formHtml(quizzes, opts = {}) {
  const err = opts.error ? `<div class="error">${escapeHtml(opts.error)}</div>` : '';
  const quizItems = quizzes
    .map(
      (q) =>
        `<label><input type="checkbox" name="quiz" value="${escapeHtml(q.id)}" checked> ` +
        `${escapeHtml(q.id)}　${escapeHtml(q.question.replace(/\n/g, ' '))}（${q.moves}本）</label>`
    )
    .join('\n');

  return pageShell('マッチ棒クイズPOP ジェネレーター', `
${err}
<form method="post" action="/build">
  <fieldset>
    <legend>出力する問題</legend>
    <div class="inline" style="margin-bottom:8px">
      <button type="button" class="toggle" onclick="setAllQuizzes(true)">全部選択</button>
      <button type="button" class="toggle" onclick="setAllQuizzes(false)">全部解除</button>
    </div>
    <div class="quiz-list">${quizItems}</div>
    <p class="hint">チェックした問題だけを出力します（未選択の場合は0件エラーになります）。</p>
  </fieldset>

  <fieldset>
    <legend>版面サイズ</legend>
    <select id="sizePreset" name="sizePreset" onchange="toggleCustom('sizePreset','sizeCustomBox')">
      ${sizeOptions('A3')}
    </select>
    <div class="custom-size" id="sizeCustomBox" style="display:none">
      <input type="number" name="sizeW" min="50" max="2000" placeholder="幅mm"> ×
      <input type="number" name="sizeH" min="50" max="2000" placeholder="高さmm">
    </div>
    <p class="hint">A4〜A1・B4〜B1、またはミリ単位で自由に指定できます（50〜2000mm）。</p>
  </fieldset>

  <fieldset>
    <legend>大判の分割印刷</legend>
    <label class="row"><input type="checkbox" id="tileEnabled" name="tileEnabled" onchange="toggleTile()"> 家庭・コンビニ用紙に分割した版も出力する</label>
    <div id="tile-options" style="display:none; margin-top:10px">
      <div class="inline">
        <span>分割する用紙:</span>
        <select id="tilePreset" name="tilePreset" onchange="toggleCustom('tilePreset','tileCustomBox')">
          ${sizeOptions('A3')}
        </select>
      </div>
      <div class="custom-size" id="tileCustomBox" style="display:none">
        <input type="number" name="tileW" min="50" max="2000" placeholder="幅mm"> ×
        <input type="number" name="tileH" min="50" max="2000" placeholder="高さmm">
      </div>
      <div class="inline" style="margin-top:8px">
        <label>のりしろ（重ね幅）: <input type="number" name="tileOverlap" value="10" min="0" max="100" style="width:70px"> mm</label>
      </div>
      <p class="hint">版面サイズより大きい・同じ用紙は指定できません（分割の必要がないため）。</p>
    </div>
  </fieldset>

  <fieldset>
    <legend>Web公開</legend>
    <label class="row"><input type="checkbox" name="webEnabled"> Web公開用の1ページ版（web.html）も出力する</label>
    <p class="hint">画面の幅に合わせて表示される、印刷サイズに依存しない一枚のHTMLです。自分のWebサーバーにアップロードして公開できます。</p>
  </fieldset>

  <button type="submit" class="submit">生成する</button>
</form>
`);
}

function resultHtml(result) {
  const items = result.entries
    .map((e) => {
      const tile = e.tilesFile
        ? ` / <a class="button-link" href="/preview/${encodeURIComponent(e.tilesFile)}">分割印刷版</a>`
        : '';
      return `<li>${escapeHtml(e.id)}　${escapeHtml(e.question)} — ` +
        `<a class="button-link" href="/preview/${encodeURIComponent(e.file)}">開く</a>${tile}</li>`;
    })
    .join('\n');
  const webLink = result.web
    ? `<a class="button-link" href="/preview/web.html">Web公開用の1ページ版を開く</a>`
    : '';
  return pageShell('生成しました', `
<div class="success">${result.quizzes.length} 枚を ${escapeHtml(result.size.name)}（${result.size.w}×${result.size.h}mm）で生成しました。</div>
<p>
  <a class="button-link" href="/preview/index.html">一覧ページを開く</a>
  <a class="button-link" href="/preview/all.html">全ページまとめて印刷</a>
  <a class="button-link" href="/preview/answers.html">解答一覧（スタッフ用）</a>
  ${webLink}
</p>
<ul class="result-list">${items}</ul>
<p><a class="back" href="/">← 条件を変えてもう一度生成する</a></p>
`);
}

function pickSize(body, presetKey, wKey, hKey) {
  const preset = body[presetKey];
  if (preset === 'CUSTOM') {
    const w = body[wKey];
    const h = body[hKey];
    if (!w || !h) throw new Error('カスタムサイズは幅と高さの両方を入力してください。');
    return `${w}x${h}`;
  }
  return preset;
}

function asArray(v) {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('リクエストが大きすぎます'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(res, requestedPath) {
  const rel = decodeURIComponent(requestedPath.replace(/^\/preview\//, ''));
  const full = path.normalize(path.join(OUT_DIR, rel));
  if (!full.startsWith(OUT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('forbidden');
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('まだ何も生成されていません。/ から生成してください。');
      return;
    }
    const ext = path.extname(full);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function handleBuildRequest(body, quizzes) {
  const sizeSpec = pickSize(body, 'sizePreset', 'sizeW', 'sizeH');
  const tileEnabled = body.tileEnabled === 'on';
  const tileSpec = tileEnabled ? pickSize(body, 'tilePreset', 'tileW', 'tileH') : null;
  const tileOverlap = tileEnabled ? Number(body.tileOverlap || 10) : 10;
  const selected = asArray(body.quiz);
  const only = selected.length === quizzes.length || selected.length === 0 ? null : selected;
  if (selected.length === 0) throw new Error('出力する問題を1つ以上選んでください。');

  return build({
    size: sizeSpec,
    tile: tileSpec,
    tileOverlap,
    web: body.webEnabled === 'on',
    data: DATA_FILE,
    out: OUT_DIR,
    only,
    verify: true,
    check: false,
  });
}

const server = http.createServer((req, res) => {
  const quizzes = loadQuizzes(DATA_FILE);

  if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(formHtml(quizzes));
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/preview/')) {
    serveStatic(res, req.url);
    return;
  }

  if (req.method === 'POST' && req.url === '/build') {
    readBody(req)
      .then((raw) => {
        const body = querystring.parse(raw);
        try {
          const result = handleBuildRequest(body, quizzes);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(resultHtml(result));
        } catch (err) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(formHtml(quizzes, { error: err.message }));
        }
      })
      .catch((err) => {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`エラー: ${err.message}`);
      });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    process.stdout.write(
      `マッチ棒クイズPOP ジェネレーター（画面版）を起動しました。\n` +
      `ブラウザで次のURLを開いてください:\n\n  http://${HOST}:${PORT}\n\n` +
      `終了するには Ctrl+C を押してください。\n`
    );
  });
}

module.exports = { server, formHtml, resultHtml, pickSize, asArray };
