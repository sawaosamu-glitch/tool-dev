'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { server } = require('../../src/gui-server');

const OUT_DIR = path.join(__dirname, '..', '..', 'dist', 'gui-output');

function withServer(fn) {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', async () => {
      const { port } = server.address();
      try {
        await fn(`http://127.0.0.1:${port}`);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

function postForm(base, path_, fields) {
  return fetch(`${base}${path_}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: querystring.stringify(fields),
    redirect: 'manual',
  });
}

// TC-G01 正常系: フォームが問題一覧を表示する
test('GUI-01 トップページに全問題のチェックボックスが表示される', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/');
    const html = await res.text();
    assert.strictEqual(res.status, 200);
    assert.match(html, /EQ-001/);
    assert.match(html, /SQ-001/);
    assert.match(html, /<form method="post" action="\/build">/);
  });
});

// TC-G02 正常系: 送信すると生成され、結果画面にプレビューリンクが出る
test('GUI-02 サイズを選んで送信すると生成され、結果ページにリンクが並ぶ', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: querystring.stringify({ quiz: ['EQ-001', 'SQ-001'], sizePreset: 'A4' }),
    });
    const html = await res.text();
    assert.strictEqual(res.status, 200);
    assert.match(html, /2 枚を A4/);
    assert.match(html, /\/preview\/EQ-001\.html/);
    assert.match(html, /\/preview\/index\.html/);

    const preview = await fetch(base + '/preview/EQ-001.html');
    const previewHtml = await preview.text();
    assert.strictEqual(preview.status, 200);
    assert.ok(previewHtml.includes('size: 210mm 297mm'));
  });
});

// TC-G03 異常系: 問題を1つも選ばずに送信するとエラー画面（フォームに戻る）
test('GUI-03 問題を1つも選ばないとエラーメッセージ付きでフォームに戻る', async () => {
  await withServer(async (base) => {
    const res = await postForm(base, '/build', { sizePreset: 'A3' });
    const html = await res.text();
    assert.strictEqual(res.status, 200);
    assert.match(html, /class="error"/);
    assert.match(html, /1つ以上選んでください/);
    assert.match(html, /<form method="post" action="\/build">/, 'フォームに戻っていない');
  });
});

// TC-G04 異常系: カスタムサイズで片方だけ空欄
test('GUI-04 カスタムサイズで幅か高さが未入力だとエラーになる', async () => {
  await withServer(async (base) => {
    const res = await postForm(base, '/build', { quiz: 'EQ-001', sizePreset: 'CUSTOM', sizeW: '600' });
    const html = await res.text();
    assert.match(html, /幅と高さの両方/);
  });
});

// TC-G05 正常系: 分割印刷を有効にすると -tiles.html も出力される
test('GUI-05 分割印刷を有効にすると *-tiles.html が生成されプレビューできる', async () => {
  await withServer(async (base) => {
    const res = await postForm(base, '/build', {
      quiz: 'SQ-001',
      sizePreset: 'A0',
      tileEnabled: 'on',
      tilePreset: 'A3',
      tileOverlap: '10',
    });
    const html = await res.text();
    assert.match(html, /分割印刷版/);
    assert.match(html, /SQ-001-tiles\.html/);

    const tiles = await fetch(base + '/preview/SQ-001-tiles.html');
    assert.strictEqual(tiles.status, 200);
    const tilesHtml = await tiles.text();
    assert.match(tilesHtml, /1行1列/);
  });
});

// TC-G06 異常系: 分割用紙が版面以上だとビルド側のエラーがそのまま表示される
test('GUI-06 分割用紙が版面以上のサイズだとエラーになる', async () => {
  await withServer(async (base) => {
    const res = await postForm(base, '/build', {
      quiz: 'EQ-001',
      sizePreset: 'A4',
      tileEnabled: 'on',
      tilePreset: 'A3',
    });
    const html = await res.text();
    assert.match(html, /分割不要です/);
  });
});

// TC-G07 境界系: /preview/ 以下のパストラバーサルを拒否する
test('GUI-07 出力ディレクトリの外を読もうとするパスは拒否する', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/preview/' + encodeURIComponent('../../package.json'));
    assert.notStrictEqual(res.status, 200);
  });
});

// TC-G08 境界系: 未生成の状態でプレビューを開くと親切な404
test('GUI-08 生成前にプレビューを開くと404で案内が出る', async () => {
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
  await withServer(async (base) => {
    const res = await fetch(base + '/preview/index.html');
    assert.strictEqual(res.status, 404);
    const text = await res.text();
    assert.match(text, /まだ何も生成されていません/);
  });
});

// TC-G09 正常系: Web公開用チェックを入れるとweb.htmlが生成されリンクが出る
test('GUI-09 Web公開用チェックを入れるとweb.htmlが生成され結果画面にリンクが出る', async () => {
  await withServer(async (base) => {
    const res = await postForm(base, '/build', { quiz: ['EQ-001', 'SQ-001'], sizePreset: 'A3', webEnabled: 'on' });
    const html = await res.text();
    assert.match(html, /Web公開用の1ページ版を開く/);
    assert.match(html, /\/preview\/web\.html/);

    const web = await fetch(base + '/preview/web.html');
    assert.strictEqual(web.status, 200);
    const webHtml = await web.text();
    assert.ok(webHtml.includes('id="quiz-EQ-001"'));
    assert.ok(webHtml.includes('id="quiz-SQ-001"'));
  });
});

// TC-G10 境界系: チェックを外すとweb.htmlは生成されない
test('GUI-10 Web公開用チェックを外すとweb.htmlは案内されない', async () => {
  await withServer(async (base) => {
    const res = await postForm(base, '/build', { quiz: 'EQ-001', sizePreset: 'A3' });
    const html = await res.text();
    assert.ok(!html.includes('Web公開用の1ページ版を開く'));
  });
});
