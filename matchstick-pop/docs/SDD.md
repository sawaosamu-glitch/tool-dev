# SDD — マッチ棒クイズPOP ジェネレーター

| 項目 | 内容 |
|---|---|
| 版 | 1.0 |
| 準拠 | IEEE 1016（4設計ビュー）／C4モデル |

## 1. 論理ビュー（コンポーネント構成）

```
CLI (src/index.js)
 ├─ build(opts) ..... 検証〜書き出しの本体（CLI・GUI共通、唯一の実装）
 ├─ quiz.js ......... 問題データの読込・検証・ソルバー呼び出し（ドメインの入口）
 │   ├─ equation-solver.js ... 計算式クイズの解の全列挙
 │   └─ squares-solver.js .... 四角クイズの解の全列挙
 ├─ segments.js ..... 計算式 → マッチ棒座標（7セグメント）
 ├─ svg.js .......... マッチ棒座標 → SVG
 └─ pop.js .......... SVG + 問題文 → POPのHTML（+ 用紙サイズ解決）
      └─ templates/pop.css
matches.js ......... 全モジュールが共有する座標プリミティブ

gui-server.js ...... ローカル専用の画面（127.0.0.1）。index.js の build() を呼ぶだけ。
                     フォーム表示・パラメータの読み替え・静的配信のみを担当し、
                     出題検証や描画のロジックは一切持たない（ADR-05）。
```

依存の向きは常に「上位 → 下位」で循環がない。`matches.js` は誰にも依存しない。
`gui-server.js` は `index.js` に依存する側であり、逆方向の依存（CLIがGUIに依存）は存在しない。

## 2. データビュー

### 座標モデル（ADR-01）

マッチ棒1本の長さを **2 half-unit** と定義し、全座標を整数で持つ。

- `h:x:y` … (x,y) から右へ1本
- `v:x:y` … (x,y) から下へ1本

**なぜ2刻みか**: 演算子 `+` の縦棒は中心が半マスずれる。長さを1にすると 0.5 が必要になり、
浮動小数の比較で解の同一判定が壊れる。長さを2にすれば全て整数で表現でき、
マッチ棒の同一性を**文字列キーの完全一致**で判定できる。これが解の列挙とテストの土台になる。

**代替案**: 浮動小数で持ち、比較時に丸める。→ 丸め誤差の温床になるため却下。

### 「動かす」の定義（ADR-02）

配置Aから配置Bへの移動本数を `|A \ B|` と定義する（`|A| = |B|` のときのみ有効）。
本数が変わる操作は「移動」ではないため、`moveCount` は `null` を返して解候補から外す。

## 3. プロセスビュー（処理フロー）

```
1. 引数解析        parseArgs        不明なオプションは即エラー
2. 用紙サイズ解決  resolveSize      規格名 or WxW。範囲外はエラー
3. 問題読込        loadQuizzes      スキーマ検証・ID重複検出
4. 出題検証        solveQuiz        ← ここが決定論センサー
     ├ 解が0通り                → NG (no-solution)
     ├ 少ない本数で解ける        → NG (solvable-with-fewer-moves)
     └ 出題時点で既に正解/目標   → NG (source-already-correct / start-already-goal)
5. 1件でもNG       → 例外を投げてビルド中止（ファイルは1つも書かない）
6. 描画            renderQuizPop → documentHtml
7. 書き出し        dist/*.html
```

**手順5が本システムの中心**である。POPは印刷して掲示してしまうと訂正が効かない。
「解けない問題を刷った」という不可逆な失敗を、ビルド時の停止に変換している。

### ソルバーの探索方法

| 種別 | 探索空間 | 打ち切り |
|---|---|---|
| 計算式 | 各スロットの候補（数字10 / 記号2 / 等号1）の直積 | 200万通り超で例外 |
| 四角 | 「k本抜く」×「空き位置にk本置く」の組合せ | 500万通り超で例外 |

いずれも全列挙のため、**解の個数が正確に分かる**。「1通りしかない良問か」「複数解の問題か」を
出題時に把握でき、スタッフ用の解答一覧に反映できる。

## 4. 物理ビュー（配置）

外部サービス・ネットワーク通信・データベースを一切使わない。
Node.jsでローカルにHTMLを書き出し、ブラウザで印刷するだけの構成。

- 実行: ローカルの Node.js 18+
- 出力: `dist/` 配下の自己完結HTML（CSSもSVGもインライン。画像ファイル参照なし）
- 配布: HTMLファイル単体をコピーすれば他端末でも同じ版面で印刷できる

## 5. 版面設計（サイズ可変の仕組み・ADR-03）

CSSカスタムプロパティ `--pw`（ページ幅mm）を基準に、**全ての寸法をページ幅の比率**で書く。

```css
.question { font-size: calc(var(--pw) * 0.052); }
```

これにより、A4でもA1でも版面比率が完全に一致する。ビルド時に差し替わるのは
`@page` の用紙指定と `--pw` / `--ph` の2値だけ（TC-U47 で構造一致を検証）。

**見出しのはみ出し対策**: 大見出しはHTMLテキストではなく **SVGの `<text>` + `textLength` +
`lengthAdjust="spacingAndGlyphs"`** で描く。フォントが端末ごとに違っても字送りが強制的に
指定幅へ合わせられるため、版面から溢れない。袋文字も `paint-order="stroke"` で確実に出る。

**画面プレビュー**: `transform: scale()` で画面幅に収める。transformはレイアウトに影響しない
ため、印刷時は `@media print` で解除するだけで原寸に戻る。

## 5b. 大判の分割印刷（ADR-04）

A0のような大判は家庭用プリンタで直接刷れない。版面（poster）そのものは変えずに、
**印刷する用紙（tile）だけを差し替えて複数枚に割る**方式にした。

- `@page` はタイル用紙サイズで固定（例: A3なら常に `297mm 420mm`）。ページごとに
  異なるサイズを指定する必要がなく、既存の複数ページ印刷（`.pop { page-break-after }`）
  と同じ仕組みで実装できる。
- 版面本体（`--pw`/`--ph`、`.pop` 以下のCSS）は一切変更しない。タイルは
  `.tile-page`（overflow:hidden・タイル寸法）の中に `.tile-canvas`（版面まるごと・
  `left`/`top` を負のオフセットで配置）を入れ子にして、**CSSのクリップだけで**
  該当領域を切り出す。ラスタ化や画像分割を行わないため、版面デザインを変更しても
  タイル側の実装に手を入れる必要がない。
- タイルの格子は `stepX = tileW - overlap` / `stepY = tileH - overlap` で計算し
  （`computeTileGrid`）、隣接タイルを `overlap` mm重ねて出力する。貼り合わせ時の
  数mmのズレを吸収し、重なり部分を切り落として整えるための余白として機能する。
- 版面がタイル用紙の整数倍でなくても、最後の行・列がはみ出す分は版面の外側
  （印刷時は白）が写るだけで、欠けや例外は発生しない。
- 各シートの左上に行・列番号とシート通し番号を印刷する（`.tile-label`）。
  貼り合わせ時にどのシートがどこに来るかを示す唯一の目印であるため、
  ラベルを消したり位置を変えたりする変更は分割印刷の使い勝手を壊す。

**代替案**: サーバサイドで版面をラスタ画像化してから画像処理で分割する方式。
→ 外部依存パッケージ0という制約（CONSTRAINTS.md 4章）に反するため却下。CSSクリップなら
Node標準機能のみで完結する。

## 5c. ローカルGUI（ADR-05）

「コマンドを打たずに画面でサイズを選びたい」という要望に対し、以下の設計を採った。

- **`build(opts)` を index.js から切り出し、CLIとGUIの共通実装にする。**
  GUI側がフォーム値を `build()` の引数（`size`/`tile`/`tileOverlap`/`only`等）に読み替えるだけで、
  検証・描画・書き出しのロジックは一切複製しない。CLIの出力が変わらないことは
  既存のE2Eテスト（CLIをサブプロセスとして実行）でそのまま担保される。
- **`127.0.0.1` 限定・依存パッケージ0。** Node標準の `http`/`querystring` のみで実装し、
  外部ネットワークにも他端末にも公開しない。CONSTRAINTS.md「外部依存を増やさない」
  「破壊的操作をしない」という既存方針をGUI導入後も維持するための制約。
- **出力先をCLIの既定（`dist/`）と分離し、`dist/gui-output/` に固定。**
  GUIで試した生成物とCLIでビルドした成果物が混ざらないようにするため。
- **`/preview/` の静的配信はパス正規化で `dist/gui-output/` の外を読めないようにする。**
  ローカル専用とはいえ、任意のローカルファイルを読めてしまう経路を作らないため
  （`path.normalize` した絶対パスが出力ディレクトリで始まることを確認してから配信）。

**代替案**: Electron等でネイティブアプリ化する。→ 依存パッケージが大量に増え、
「外部依存パッケージを追加しない」という既存方針（CONSTRAINTS.md 4章）に反するため却下。
ブラウザはどの端末にも既にあるため、素のHTTPサーバーで十分だった。

## 5d. Web公開用の1ページ版（ADR-06）

印刷用のPOP（`documentHtml`）は「用紙サイズに正確に一致すること」が最優先で、
`@page`・固定mm・印刷時のスケール解除を前提にしている。これをそのままWeb公開に転用すると、
ブラウザの表示幅に関わらず常に同じ画素サイズで描画され、スマホでは小さすぎ・広い画面では
中央に取り残される。「Webで見せる」と「紙に印刷する」は要求が異なるため、**別の出力
（`webContent`/`webPageHtml`）として分離**した。

- **JSによるレスポンシブスケーリング**: `.pop`自体はmm由来の固定px（`--pw`/`--ph`）で
  組み立て、それを包む `.web-frame` の実測幅（`clientWidth`）に応じて `transform: scale()`
  の倍率をJSで都度計算する（`resize`/`DOMContentLoaded`/`load` で再計算）。CSSの
  コンテナクエリ単位（`cqw`）による無JS実装も検討したが、`scale()`の引数は無次元数が
  必要でありレングス同士の除算に頼る手法はブラウザ互換性が不安定なため、素直なJS計測を採った。
- **`webContent` と `webPageHtml` を分離**: `webContent` は `<!DOCTYPE>`/`<html>`/`<head>`/
  `<body>` を含まない「本文の断片」を返し、`webPageHtml` はそれを正規の文書構造に包む。
  本文だけを別の器（他のCMSのテンプレートや、外部サービスの「本文だけ貼り付け」機能）に
  埋め込みたいケースを、コードの複製なしに両対応できる。
- **`:root { --pw / --ph }` を明示的に定義する**: `documentHtml`はこの変数をmm単位で
  `<style>`に書き出しているが、`webContent`ではpx単位で書く。値の単位が違うだけで、
  pop.css側の`calc(var(--pw) * 係数)`という比率の作り方は完全に共用できる
  （版面デザインを一切変更していないことの裏付けでもある）。
- **解答一覧のCSSを共有化**: 従来 `answerSheetHtml` の `<style>` に直書きしていた解答一覧の
  見た目を `ANSWER_SHEET_CSS` として切り出し、`answerSheetHtml`（印刷用A4単独ページ）と
  `webContent`（1ページ内に埋め込み）の両方から使う。クラス名は `.pop` 側のCSSと衝突しない
  よう `.ans-*` 系のみ使用し、Web版固有の見た目（ナビ・カード・背景）は `web-` 接頭辞で
  完全に分離した（同一ドキュメントに両CSSが同居するため）。

## 6. 安全設計

| 項目 | 設計 |
|---|---|
| 破壊的操作 | なし。ファイルの削除・上書き前の削除を一切行わない（書き込みのみ） |
| 外部送信 | なし。ネットワークアクセスを行うコードを含まない |
| 課金 | なし。外部APIを使わない |
| 注入対策 | 問題データ由来の文字列は `escapeHtml` を通してからHTML/SVGに埋める（TC-U45） |
| 失敗時 | 検証NGなら出力ディレクトリを作らずに終了（TC-E04） |

## 7. モジュールインターフェース

| モジュール | 主要API |
|---|---|
| `matches.js` | `key`, `parseKey`, `endpoints`, `translate`, `bbox`, `moveCount` |
| `segments.js` | `digitMatches`, `operatorMatches`, `expressionMatches`, `expressionWidth` |
| `equation-solver.js` | `evaluateExpression`, `isCorrectEquation`, `solveEquation(expr, moves)` |
| `squares-solver.js` | `findSquares`, `countSquares`, `leftoverMatches`, `solveSquares(start, opts)` |
| `quiz.js` | `validateQuiz`, `quizMatches`, `solveQuiz`, `loadQuizzes` |
| `svg.js` | `renderMatches(keys)`, `renderSolution(from, to)` |
| `pop.js` | `resolveSize`, `renderQuizPop`, `documentHtml`, `answerSheetHtml`, `indexHtml`, `computeTileGrid`, `tiledDocumentHtml`, `webContent`, `webPageHtml` |
| `index.js` | `parseArgs`, `verifyAll`, `build(opts)`, `main` |
| `gui-server.js` | `server`（http.Server）。`build()` を呼ぶのみで独自の検証・描画ロジックは持たない |
