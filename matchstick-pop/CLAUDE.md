# CLAUDE.md — matchstick-pop

## 1. これは何か
マッチ棒クイズのPOP（掲示用ポスター）を、問題データから生成するCLI（＋ローカルGUI）。
イベント会場に貼る「挑戦者求ム／Dr.マッチ棒からの挑戦状!!」を量産するために作った。

## 2. 最重要の性質
**掲示物は刷ったら訂正できない。** そのためビルドは「解けない問題・少ない本数で解けてしまう問題」を
検出したら1ファイルも書かずに中止する。この停止装置を弱めないこと。

## 3. 動かす
```bash
node src/index.js                          # A3で全問ビルド → dist/
node src/index.js --size A1                # サイズ変更
node src/index.js --size A0 --tile A3      # 大判をA3分割印刷用にも出力（<ID>-tiles.html）
node src/index.js --check                  # 検証だけ（ファイルを書かない）
node src/index.js --web                    # Web公開用の1ページ版（web.html）も出力
npm run gui                                # 画面からサイズ・分割印刷・Web公開を選んで生成（127.0.0.1のみ）
npm run standalone                         # Node不要のdist/match.html（ダブルクリックで使える）を生成
npm test                                   # 76件
```

## 4. ディレクトリ
- `data/quizzes.json` — 問題データ。ここだけ触れば問題を差し替えられる
- `src/lib/matches.js` — 座標プリミティブ。全モジュールの土台
- `src/lib/segments.js` — 計算式 → 7セグメントのマッチ棒
- `src/lib/equation-solver.js` / `squares-solver.js` — 解の全列挙
- `src/lib/quiz.js` — データ検証とソルバー呼び出しの入口
- `src/lib/svg.js` — マッチ棒の描画
- `src/lib/pop.js` + `src/templates/pop.css` — POPの版面（`tiledDocumentHtml`が大判の分割印刷を担当）
- `src/index.js` — CLI。`build(opts)` が本体で、CLIとGUIサーバーの両方から呼ばれる
- `src/gui-server.js` — ローカル専用の生成画面（`build()` を呼ぶだけで独自ロジックは持たない）
- `scripts/build-standalone.js` — `src/lib/*.js`をrequire/module.exportsだけ取り除いてそのまま連結し、
  `dist/match.html`（Node不要の1ファイル版）を作る。ロジックは複製せず機械的に束ねるだけ
- `scripts/standalone-app.js` / `standalone-app.css` / `standalone-body.html` — match.html専用のUI（フォーム・プレビュー）

## 5. 座標の読み方
`h:4:2` = 「(4,2)から右へマッチ棒1本」。`v:4:2` = 「(4,2)から下へ1本」。
**マッチ棒1本の長さは2**なので、格子の交点は 0,2,4,6… になる。

## 6. 変更するときの注意
- 座標に小数を持ち込まない（CONSTRAINTS.md 2章）
- `.pop` の内側の寸法は `calc(var(--pw) * 係数)` で書く（px/mm直書き禁止）。
  `.frame`/`.tile-page`/`.tile-canvas` など`.pop`の外側にあるページレイアウト用の
  ラッパーはこの限りでない（画面プレビューやタイル分割の機構であり版面デザインではないため）
- 大見出しをHTMLテキストに戻さない（フォント差で溢れる）
- ファイル削除・外部ネットワークアクセス・外部依存パッケージを足さない。
  `gui-server.js` は例外的に `http` サーバーを立てるが `127.0.0.1` 限定・外部通信なしで、
  中身は `build()` を呼ぶだけ（ロジックの二重化はしない）

## 7. 詳しい設計
- 要件: `docs/SRS.md`
- 設計と設計判断(ADR): `docs/SDD.md`
- テスト: `docs/TEST_PLAN.md` / `docs/E2E_SCENARIOS.md`
- 不変条件: `CONSTRAINTS.md`
- 使い方（利用者向け）: `README.md`
