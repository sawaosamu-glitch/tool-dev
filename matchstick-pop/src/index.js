#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadQuizzes, solveQuiz } = require('./lib/quiz');
const {
  resolveSize, renderQuizPop, documentHtml, answerSheetHtml, indexHtml, tiledDocumentHtml, webPageHtml,
} = require('./lib/pop');

const USAGE = `マッチ棒クイズPOP ジェネレーター

  node src/index.js [options]

  --size <A4|A3|A2|A1|A0|B4|B3|B2|B1|600x900>   用紙サイズ（既定: A3）
  --tile <A4|A3|...>   A0等の大判を、この用紙サイズに分割して<ID>-tiles.htmlも出力する
  --tile-overlap <mm>  タイルどうしの重ね幅（既定: 10）貼り合わせ・切り揃えの目安
  --web             Web公開用の1ページ版（web.html）も出力する
  --data <file>     問題データ（既定: data/quizzes.json）
  --out  <dir>      出力先（既定: dist）
  --only <ID,ID>    指定IDだけ出力
  --no-verify       ソルバーによる検証をスキップ（非推奨）
  --check           ファイルを書かず検証だけ行う
  -h, --help        このヘルプ
`;

const FLAGS = new Set(['--size', '--tile', '--tile-overlap', '--data', '--out', '--only']);
const BOOLS = new Set(['--no-verify', '--check', '--web', '-h', '--help']);

function parseArgs(argv) {
  const opts = {
    size: 'A3', tile: null, tileOverlap: 10, web: false, data: 'data/quizzes.json', out: 'dist',
    only: null, verify: true, check: false, help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (BOOLS.has(a)) {
      if (a === '--no-verify') opts.verify = false;
      else if (a === '--check') opts.check = true;
      else if (a === '--web') opts.web = true;
      else opts.help = true;
      continue;
    }
    if (!FLAGS.has(a)) throw new Error(`不明なオプション: ${a}\n\n${USAGE}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`${a} には値が必要です`);
    i += 1;
    if (a === '--size') opts.size = v;
    else if (a === '--tile') opts.tile = v;
    else if (a === '--tile-overlap') {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new Error(`--tile-overlap は0以上の数値で指定してください: ${v}`);
      opts.tileOverlap = n;
    }
    else if (a === '--data') opts.data = v;
    else if (a === '--out') opts.out = v;
    else opts.only = v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return opts;
}

function verifyAll(quizzes) {
  const report = quizzes.map((q) => ({ id: q.id, ...solveQuiz(q) }));
  const bad = report.filter((r) => !r.ok);
  return { report, bad };
}

/**
 * CLI・GUIサーバーの両方から呼ばれる本体。ファイルI/O以外の分岐は持たない。
 * 検証NGなら例外を投げて呼び出し元に伝える（ファイルは書かれない）。
 */
function build(opts) {
  const size = resolveSize(opts.size);
  const tileSize = opts.tile ? resolveSize(opts.tile) : null;
  if (tileSize && tileSize.w >= size.w && tileSize.h >= size.h) {
    throw new Error(`--tile ${opts.tile} は --size ${size.name}（${size.w}×${size.h}mm）以上のため分割不要です`);
  }
  const all = loadQuizzes(opts.data);
  const quizzes = opts.only ? all.filter((q) => opts.only.includes(q.id)) : all;
  if (quizzes.length === 0) throw new Error('対象の問題が0件です（--only の指定を確認してください）');

  let report = null;
  if (opts.verify || opts.check) {
    const v = verifyAll(quizzes);
    report = v.report;
    if (v.bad.length > 0) {
      throw new Error(`検証に失敗した問題があります: ${v.bad.map((b) => `${b.id}(${b.reason})`).join(', ')}`);
    }
  }
  if (opts.check) {
    return { checked: true, size, tileSize, quizzes, report };
  }

  const outDir = path.resolve(opts.out);
  fs.mkdirSync(outDir, { recursive: true });

  const entries = [];
  let tileCount = 0;
  for (const q of quizzes) {
    const file = `${q.id}.html`;
    const section = renderQuizPop(q);
    const html = documentHtml({
      title: `${q.id} マッチ棒クイズPOP`,
      size,
      sections: [section],
    });
    fs.writeFileSync(path.join(outDir, file), html, 'utf8');

    let tilesFile = null;
    if (tileSize) {
      tilesFile = `${q.id}-tiles.html`;
      const tilesHtml = tiledDocumentHtml({
        title: `${q.id} マッチ棒クイズPOP（分割印刷）`,
        size,
        tileSize,
        overlap: opts.tileOverlap,
        section,
      });
      fs.writeFileSync(path.join(outDir, tilesFile), tilesHtml, 'utf8');
      tileCount += 1;
    }
    entries.push({ id: q.id, file, tilesFile, question: q.question.replace(/\n/g, ' ') });
  }

  fs.writeFileSync(
    path.join(outDir, 'all.html'),
    documentHtml({ title: 'マッチ棒クイズPOP 全ページ', size, sections: quizzes.map((q) => renderQuizPop(q)) }),
    'utf8'
  );
  fs.writeFileSync(path.join(outDir, 'answers.html'), answerSheetHtml(quizzes), 'utf8');

  if (opts.web) {
    fs.writeFileSync(
      path.join(outDir, 'web.html'),
      webPageHtml({ title: 'マッチ棒クイズPOP', size, quizzes }),
      'utf8'
    );
  }

  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml(entries, size, tileSize, opts.web), 'utf8');

  return { checked: false, size, tileSize, web: opts.web, quizzes, entries, tileCount, outDir, report };
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const result = build(opts);

  if (result.report) {
    for (const r of result.report) {
      const mark = r.ok ? 'OK  ' : 'NG  ';
      process.stdout.write(`${mark}${r.id}  解 ${r.solutions.length} 通り  (${r.reason})\n`);
    }
  }
  if (result.checked) {
    process.stdout.write(`\n検証のみ完了。${result.quizzes.length} 問すべて成立しています。\n`);
    return 0;
  }

  process.stdout.write(
    `\n${result.quizzes.length} 枚を ${result.size.name}（${result.size.w}×${result.size.h}mm）で出力しました。\n` +
    (result.tileSize
      ? `  うち ${result.tileCount} 枚を ${result.tileSize.name} 分割印刷用（*-tiles.html）としても出力しました。\n`
      : '') +
    (result.web ? `  Web公開用の1ページ版（web.html）も出力しました。\n` : '') +
    `  ${path.join(result.outDir, 'index.html')}\n`
  );
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`エラー: ${err.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, verifyAll, build, main, USAGE };
