'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'src', 'index.js');

function run(args, opts = {}) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: 'utf8', ...opts });
}
function tmpdir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `matchstick-${tag}-`));
}

// TC-E01 正常系: 既定サイズで全問題を出力する
test('E2E-01 ビルドすると問題数ぶんのPOPと索引・解答が出力される', () => {
  const out = tmpdir('build');
  const log = run(['--out', out]);
  const files = fs.readdirSync(out);
  assert.ok(files.includes('index.html'));
  assert.ok(files.includes('all.html'));
  assert.ok(files.includes('answers.html'));
  assert.ok(files.includes('EQ-001.html'));
  assert.ok(files.includes('SQ-001.html'));
  assert.match(log, /8 枚を A3/);
  assert.ok(!log.includes('NG'), '検証NGの問題がある');
});

// TC-E02 正常系: サイズ可変
test('E2E-02 A4とA1で用紙指定が切り替わる', () => {
  const a4 = tmpdir('a4');
  const a1 = tmpdir('a1');
  run(['--size', 'A4', '--out', a4, '--only', 'EQ-001']);
  run(['--size', 'A1', '--out', a1, '--only', 'EQ-001']);
  const h4 = fs.readFileSync(path.join(a4, 'EQ-001.html'), 'utf8');
  const h1 = fs.readFileSync(path.join(a1, 'EQ-001.html'), 'utf8');
  assert.ok(h4.includes('size: 210mm 297mm'));
  assert.ok(h1.includes('size: 594mm 841mm'));
});

// TC-E03 正常系: 生成物が壊れていない
test('E2E-03 出力HTMLに NaN / undefined / 未エスケープが含まれない', () => {
  const out = tmpdir('sane');
  run(['--out', out]);
  for (const f of fs.readdirSync(out)) {
    const html = fs.readFileSync(path.join(out, f), 'utf8');
    assert.ok(!html.includes('NaN'), `${f} に NaN`);
    assert.ok(!html.includes('undefined'), `${f} に undefined`);
    assert.ok(!/<svg[^>]*>\s*<\/svg>/.test(html), `${f} に空のSVG`);
    assert.strictEqual((html.match(/<html/g) || []).length, 1, `${f} のHTML構造が壊れている`);
  }
});

// TC-E04 異常系: 壊れた問題データ
test('E2E-04 解けない問題が混ざったデータはビルドを中止する', () => {
  const dir = tmpdir('bad');
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(bad, JSON.stringify({
    quizzes: [{ id: 'EQ-999', type: 'equation', difficulty: 1, moves: 1, question: 'q', expr: '1+1=8' }],
  }));
  assert.throws(
    () => run(['--data', bad, '--out', path.join(dir, 'out')], { stdio: 'pipe' }),
    (err) => /検証に失敗/.test(String(err.stderr)) && err.status === 1
  );
  assert.ok(!fs.existsSync(path.join(dir, 'out')), '検証失敗なのにファイルを書いている');
});

// TC-E05 異常系: 不正な引数
test('E2E-05 不明なオプションと不正な用紙サイズを拒否する', () => {
  assert.throws(() => run(['--bogus'], { stdio: 'pipe' }), (e) => /不明なオプション/.test(String(e.stderr)));
  assert.throws(() => run(['--size', 'Z9'], { stdio: 'pipe' }), (e) => /unknown size/.test(String(e.stderr)));
  assert.throws(() => run(['--size'], { stdio: 'pipe' }), (e) => /値が必要/.test(String(e.stderr)));
  assert.throws(() => run(['--only', 'NOPE-001'], { stdio: 'pipe' }), (e) => /対象の問題が0件/.test(String(e.stderr)));
});

// TC-E06 境界系: --check は検証のみでファイルを書かない
test('E2E-06 --check はファイルを書かずに検証結果だけ返す', () => {
  const out = tmpdir('check');
  const log = run(['--check', '--out', out]);
  assert.match(log, /検証のみ完了/);
  assert.strictEqual(fs.readdirSync(out).length, 0);
});

// TC-E07 境界系: 最小・最大サイズ
test('E2E-07 カスタムサイズの上下限を守る', () => {
  const out = tmpdir('custom');
  run(['--size', '600x900', '--out', out, '--only', 'EQ-002']);
  assert.ok(fs.readFileSync(path.join(out, 'EQ-002.html'), 'utf8').includes('size: 600mm 900mm'));
  assert.throws(() => run(['--size', '5000x5000'], { stdio: 'pipe' }), (e) => /out of range/.test(String(e.stderr)));
});

// TC-E08 正常系: 大判を --tile で分割印刷用に出力する
test('E2E-08 --tile を指定するとA0がA3の分割印刷用HTMLとしても出力される', () => {
  const out = tmpdir('tile');
  const log = run(['--size', 'A0', '--tile', 'A3', '--out', out, '--only', 'EQ-001']);
  const html = fs.readFileSync(path.join(out, 'EQ-001-tiles.html'), 'utf8');
  assert.ok(html.includes('@page { size: 297mm 420mm; margin: 0; }'));
  assert.strictEqual((html.match(/class="tile-page"/g) || []).length, 9);
  assert.match(log, /うち 1 枚を A3 分割印刷用/);
  const index = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.ok(index.includes('EQ-001-tiles.html'));
});

// TC-E09 異常系: 分割設定の不正値を拒否する
test('E2E-09 分割不要なタイル指定・不正なのりしろを拒否する', () => {
  assert.throws(
    () => run(['--size', 'A3', '--tile', 'A2'], { stdio: 'pipe' }),
    (e) => /分割不要/.test(String(e.stderr))
  );
  assert.throws(
    () => run(['--size', 'A0', '--tile', 'A3', '--tile-overlap', '-1'], { stdio: 'pipe' }),
    (e) => /0以上の数値/.test(String(e.stderr))
  );
});

// TC-E10 正常系: --web でWeb公開用の1ページ版が出力され、索引からもリンクされる
test('E2E-10 --web を指定するとweb.htmlが出力され、全問へのアンカーを含む', () => {
  const out = tmpdir('web');
  const log = run(['--web', '--out', out]);
  assert.match(log, /Web公開用の1ページ版（web\.html）も出力しました/);
  const html = fs.readFileSync(path.join(out, 'web.html'), 'utf8');
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('id="quiz-EQ-001"'));
  assert.ok(html.includes('id="quiz-SQ-002"'));
  assert.ok(!html.includes('NaN'));
  assert.ok(!html.includes('undefined'));
  const index = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.ok(index.includes('web.html'));
});

// TC-E11 境界系: --web を付けなければ web.html は出力されない
test('E2E-11 --web を付けなければweb.htmlは作られない', () => {
  const out = tmpdir('noweb');
  run(['--out', out]);
  assert.ok(!fs.existsSync(path.join(out, 'web.html')));
});
