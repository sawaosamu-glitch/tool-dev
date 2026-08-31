# 設計書（SDD） — memory-assistant（IEEE 1016準拠）

## 1. 論理ビュー（コンポーネント構成）

### コンポーネント一覧

| ID | コンポーネント名 | 責務 | 依存先 | 対応要件 |
|---|---|---|---|---|
| C-01 | NoteStore | メモのCRUD、FTS5インデックス同期、DB整合性制約の適用 | SQLite（better-sqlite3） | FR-DATA-001〜005 |
| C-02 | SearchService | FTS5によるキーワード検索、BM25ランキング、ハイライト抜粋生成 | C-01 | FR-SYS-001 |
| C-03 | QAService | 検索実行→根拠なき回答拒否判定→(Ollama利用可なら)生成AI呼び出しの統制 | C-02, C-04 | FR-SYS-002, FR-SYS-003, FR-SYS-004 |
| C-04 | OllamaAdapter | Ollama REST APIのラッパー。ヘルスチェック・生成呼び出し・タイムアウト制御 | 外部プロセス（Ollama, localhost:11434） | FR-SYS-003, FR-EXT-001 |
| C-05 | BackupService | WALモード設定、起動時/定期/終了時バックアップ、世代管理（7世代保持） | C-01, ファイルシステム | FR-SYS-005 |
| C-06 | ExportService | 全メモをMarkdown/JSONへ一括出力 | C-01, ファイルシステム | FR-DATA-006 |
| C-07 | ConfigManager | config.jsonの読込・検証（ポート番号・Ollamaモデル名・バックアップ間隔） | ファイルシステム | FR-ADM-001 |
| C-08 | WebServer | HTTPルーティング、入力バリデーション、静的UI配信、127.0.0.1バインド | C-01〜C-07 | 全FR（UI起点） |
| C-09 | StaticUI | ブラウザ側の画面描画・イベント処理（ビルド不要の素のHTML/CSS/JS） | C-08（REST経由） | 全FR（画面表示） |

### コンポーネント間の依存関係

```
StaticUI(C-09) --HTTP--> WebServer(C-08) --> NoteStore(C-01)
                                        --> SearchService(C-02) --> NoteStore(C-01)
                                        --> QAService(C-03) --> SearchService(C-02)
                                                              --> OllamaAdapter(C-04) --HTTP(localhost:11434)--> Ollama[外部プロセス]
                                        --> BackupService(C-05) --> NoteStore(C-01)
                                        --> ExportService(C-06) --> NoteStore(C-01)
                        ConfigManager(C-07) --読込--> WebServer起動処理, QAService, BackupService
```

### インターフェース定義（全公開関数）

| コンポーネント | 公開関数 | 入力 | 出力 | エラー時 |
|---|---|---|---|---|
| NoteStore | `create(note)` | `{title, body, tags}` | `Note`（id, created_at付き） | `body`空文字/50001文字以上は例外`ValidationError`をthrow |
| NoteStore | `findAll(opts)` | `{tag?, page?}` | `Note[]`（`ORDER BY created_at DESC, id DESC`で確定順序） | 例外なし（0件は空配列） |
| NoteStore | `update(id, note)` | `number, {title, body, tags}` | 更新後の`Note` | 存在しないIDは`NotFoundError`をthrow。`body`バリデーションは`create`と同一 |
| NoteStore | `delete(id)` | `number` | `boolean`（削除成功時true） | 存在しないIDは`false`を返す（例外にしない。冪等性のため） |
| SearchService | `search(query)` | `string`（3〜1000文字） | `{note, snippet, score}[]`（score昇順=一致度高い順） | 2文字以下は`ValidationError`をthrow（WebServer層で事前に弾く想定だが二重防御）。0件は例外なし空配列 |
| SearchService | `buildFtsQuery(text)`（内部関数） | `string`（自由文） | FTS5 MATCH用クエリ文字列 | 入力から**ちょうど3文字幅**の重複スライディングウィンドウで連続部分文字列（トリグラム）を全て抽出し、重複除去のうえ二重引用符で囲んで`OR`結合した文字列を返す（例:「コーヒー豆」→`"コーヒ" OR "ーヒー" OR "ヒー豆"`）。trigramトークナイザーは3文字未満のクエリに対して構造上マッチできないため（Phase 6実装検証で実測確認済み、ADR-002参照）、2文字以下の入力しか得られない場合（例: 質問文が2文字以下）は空配列を返し、呼び出し元のQAServiceは検索結果0件として扱う |
| QAService | `ask(question)` | `string` | `{mode: 'search'\|'generated'\|'refused', results, answer?}` | 内部でOllama失敗を捕捉し`mode:'search'`にフォールバック |
| QAService | `isRelevant(results, question)`（内部関数） | `SearchService.search()`の結果, `string` | `boolean` | 結果が0件なら`false`。1件以上ある場合、質問文の全トリグラム集合のうち上位結果（title+body）に実際に含まれる割合（カバレッジ率）を計算し、「一致トリグラム数が2以上（質問のトリグラム総数が3以下の短い質問は1以上）」かつ「カバレッジ率15%以上」の両方を満たす場合のみ`true`。FTS5のMATCH自体は1トリグラムの偶然一致でも成立するため、BM25スコア単体ではなく複数トリグラムの一致数を見ることで「たまたま1箇所だけ一致した無関係な結果」を弾く（FR-SYS-004(a)(b)両方をこの1関数で判定する。閾値はPhase 7 E2E-05bで実データに近いケースを用いて調整可能とする） |

**実機検証による補記（2026-08-31）**: 当初「2文字以上で検索可能」と設計していたが、Phase 6実装環境（better-sqlite3 v13.0.3）での実機テストで、2文字のMATCHクエリは常に0件を返す（1文字も一致しない）ことを確認した。trigramトークナイザーは3文字単位のインデックスであり、2文字の入力は原理的に完全なトリグラムを構成できないため。これを受けSRS/SDD/ACC/READMEの最小文字数を「3文字以上」に統一した。
| BackupService | `runBackup()` | なし | `{path, timestamp}` | 失敗時は例外をthrowせず`{path: null, error}`を返し、呼び出し元が連続失敗回数をカウントする |
| BackupService | `pruneOldBackups(keep=7)` | `number`（保持世代数） | 削除したファイル数 | ディレクトリ読み取り失敗時は0を返しログ出力 |
| BackupService | `getConsecutiveFailureCount()` | なし | `number` | - |
| ExportService | `exportAll(format)` | `'markdown'\|'json'` | `{path}`（`exports/notes_[timestamp].md`または`.json`） | 書き込み失敗時は例外をthrow（WebServerが500エラーに変換） |
| ConfigManager | `load()` | なし | `{port, ollamaModel, backupIntervalHours}` | 不正値・欠損値は既定値（port:3000, ollamaModel:'qwen3:4b', backupIntervalHours:24）にフォールバックしログ出力（例外をthrowしない） |
| OllamaAdapter | `healthCheck()` | なし | `boolean`（3秒タイムアウト） | 例外は捕捉し`false`を返す |
| OllamaAdapter | `generate(prompt, context)` | `string, string[]` | `string`（10秒タイムアウト） | タイムアウト/エラー時は例外をthrow（呼び出し元QAServiceが捕捉） |

**Round 1レビュー修正（2026-08-31）**: NoteStore.update/delete、BackupService、ExportService、ConfigManagerのインターフェースを追加（Codex役指摘C-007）。SearchService.buildFtsQuery()で自然文→FTS5クエリの変換アルゴリズムを明記（Codex役指摘C-005）。QAService.isRelevant()でFR-SYS-004の低関連度判定ロジックを明記（Codex役指摘C-001）。NoteStore.findAllの並び順にidタイブレークを追加（Codex役指摘C-006）。

---

## 2. プロセスビュー（フロー・並行性）

### 起動フロー

```
1. ConfigManager が config.json を読込・検証（不正値は既定値にフォールバック）
2. NoteStore が data/memory-assistant.db を開き、PRAGMA journal_mode=WAL を設定
3. PRAGMA integrity_check を実行 → 失敗ならエラー画面表示で起動中断（復元手順を提示）
4. BackupService が起動時バックアップを実行
5. OllamaAdapter.healthCheck() を実行しセッション中の状態としてキャッシュ
6. WebServer が 127.0.0.1:[config.port] で待受開始
7. SIGINT/SIGTERM を捕捉するハンドラを登録（終了時バックアップ用）
```

### リクエストフロー例: 質問応答（FR-SYS-002〜004）

```
1. StaticUI → POST /api/ask { question }
2. WebServer が入力バリデーション（1〜1000文字）
3. QAService.ask(question) 実行
   a. SearchService.buildFtsQuery(question) でFTS5クエリを構築し、SearchService.search()で上位5件取得
   b. QAService.isRelevant(results, question) を判定。false（0件、または低関連度）→ mode:'refused' を返す（Ollama呼び出しを一切行わない。FR-SYS-004、(a)(b)両ケースをこの1関数でカバー）
   c. true かつ Ollama利用不可（起動時ヘルスチェックfalse） → mode:'search' で抜粋+出典を返す
   d. true かつ Ollama利用可 → OllamaAdapter.generate() を呼び出す
      - 成功（10秒以内） → mode:'generated' で生成回答+出典を返す
      - 失敗/タイムアウト → mode:'search' にフォールバック（エラーを利用者に見せない）
4. WebServer がJSONレスポンスを返却
5. StaticUI が mode に応じた表示を行う
```

### 並行処理・非同期の扱い

- better-sqlite3は同期APIのため、DB操作はイベントループを短時間ブロックする。個人・単一ユーザー規模（同時アクセス1）では実用上問題ないと判断（research_v2.md C2参照）
- Ollama呼び出しのみ非同期（fetch + AbortController による10秒タイムアウト）
- バックアップ処理は`setInterval`によるタイマー実行。SQLiteのオンラインバックアップAPI自体は他の書き込みトランザクションをロックしないが、better-sqlite3は同期APIであるため`backup()`呼び出し中はNode.jsのイベントループがJS実行としては占有される（＝2つの異なるレベルのブロッキングがある）。個人利用規模（DBサイズ数十MB程度まで）では体感できる遅延にはならないと判断するが、Phase 7のE2E-06実行時に体感速度を確認する（Codex役指摘C-021対応）

### エラーハンドリングフロー

- DB書き込み失敗 → WebServerが500エラーを返し、StaticUIが入力内容を保持したままエラーバナー表示（SRS 8.5 #1）
- Ollamaタイムアウト/エラー → QAServiceが検索ベースQAへ自動フォールバック（SRS 8.5 #3）
- 起動時DB破損検知 → 起動中断＋復元手順表示（SRS 8.5 #4）

---

## 3. データビュー（モデル・データフロー）

### データモデル

| エンティティ | 属性 | 型 | 制約 |
|---|---|---|---|
| Note | id, title, body, tags, created_at, updated_at | INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT | body: 1〜50000文字、`CHECK(length(body)>=1 AND length(body)<=50000)`（上限もDB制約に含める。Codex役指摘C-017対応） |
| NoteFTS（仮想テーブル） | rowid(=Note.id), title, body | FTS5(tokenize='trigram') | Noteとトリガーで同期 |
| Config | port, ollamaModel, backupIntervalHours | INTEGER, TEXT, INTEGER | JSON、DB外（config.jsonファイル）。既定値: port=3000, ollamaModel='qwen3:4b', backupIntervalHours=24（出典: SRS 6章/ADR-003/SRS 4章。ConfigManager.load()がフォールバック時にもこの値を使用する） |

### タグ絞り込みのSQL方式（Codex役指摘C-015対応）
`tags`はカンマ区切りの単一TEXTカラムのため、単純な`LIKE '%tag%'`では部分文字列の誤マッチ（例:「AI」で絞り込むと「AIチーム」も誤ヒット）が発生する。NoteStore.findAll({tag})は先頭・末尾にカンマを付与した完全一致方式を採用する:
```sql
WHERE (',' || tags || ',') LIKE '%,' || ? || ',%'
```
（`?`には絞り込み対象のタグ文字列をそのままバインドする）

### データフロー

```
[ブラウザ入力] → WebServerバリデーション → NoteStore.create/update/delete
   → SQLite notes テーブル書き込み
   → SQLトリガーで notes_fts へ自動反映
   → SearchService/QAServiceが notes_fts を検索
```

### 保存方式
- メタデータ・本文: SQLite（`data/memory-assistant.db`、WALモード）
- バックアップ: `backups/backup_[timestamp].db`（直近7世代）
- エクスポート: `exports/notes_[timestamp].md` または `.json`
- 設定: `config.json`（プロジェクトルート、Git管理外にはしない＝機密情報を含まないため）

### データライフサイクル
SRS 9.2/9.4を参照。物理削除のみ、論理削除なし。バックアップ/エクスポートは読み取り専用の複製として扱う。

---

## 4. 物理ビュー（デプロイ構成）

### 実行環境

| 項目 | 内容 |
|---|---|
| OS | Windows / macOS / Linux（NFR-PORT-001） |
| ランタイム | Node.js 18 LTS以上（20/22系推奨） |
| 外部プロセス（任意） | Ollama（未導入でも動作継続） |
| ネットワーク | 127.0.0.1のみ待受、外部公開なし |

### デプロイ方法

```bash
npm install
npm start
# → http://localhost:3000 をブラウザで開く
```

### ディレクトリ構成

```
memory-assistant/
├── src/
│   ├── server.js              # エントリポイント（DB初期化・バックアップ・Ollama検出・listen・シグナル処理）
│   ├── app.js                 # Expressアプリの組み立てのみ（テスト容易性のためserver.jsから分離）
│   ├── routes/
│   │   ├── notes.js           # /api/notes CRUD
│   │   ├── search.js          # /api/search
│   │   └── ask.js             # /api/ask (QA)
│   ├── services/
│   │   ├── noteStore.js       # C-01
│   │   ├── searchService.js   # C-02
│   │   ├── qaService.js       # C-03
│   │   ├── backupService.js   # C-05
│   │   └── exportService.js   # C-06
│   ├── adapters/
│   │   └── ollamaAdapter.js   # C-04
│   ├── config.js              # C-07
│   └── db/
│       ├── schema.sql
│       └── migrate.js
├── public/                    # C-09 静的UI（ビルド不要）
│   ├── index.html
│   ├── app.js
│   └── style.css
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── data/                      # gitignore対象（SQLiteファイル）
├── backups/                   # gitignore対象
├── exports/                   # gitignore対象
├── logs/                      # gitignore対象
├── docs/
├── harness/
├── research/
├── config.json
├── CLAUDE.md
├── CONSTRAINTS.md
└── PROGRESS.md
```

---

## 5. C4モデル

### Container図

| Container | 技術 | 責務 |
|---|---|---|
| Web App | Node.js + Express | UI配信・API提供・全ビジネスロジックの統制 |
| Local Database | SQLite（ファイル） | メモデータ・全文検索インデックスの永続化 |
| Ollama（任意） | 外部ローカルプロセス | 生成ベースQAの回答生成（未導入時は機能縮退） |
| Browser | 標準ブラウザ | UI表示、Web Appとのlocalhost通信 |

### Component図（Web App内部）

上記「1. 論理ビュー」のコンポーネント一覧（C-01〜C-09）を参照。

---

## 6. 横断的ルール（Cross-Cutting Concerns）

| # | ルール | 内容 | 適用範囲 |
|---|---|---|---|
| CC-01 | エラーハンドリング | 全ての外部呼び出し（Ollama）はtry-catch必須。DB操作はbetter-sqlite3の例外をWebServer層で捕捉しHTTPエラーへ変換 | 全コンポーネント |
| CC-02 | ログ出力 | 処理開始/終了/エラーを`logs/app.log`へ出力。メモ本文・質問文などの個人データはログに出力しない | 全コンポーネント |
| CC-03 | 設定値管理 | ポート番号・Ollamaモデル名・バックアップ間隔はハードコード禁止、`config.json`経由で管理 | ConfigManager, WebServer, QAService, BackupService |
| CC-04 | 入力バリデーション | 外部入力（HTTPリクエストボディ）は必ずWebServer層で検証してからサービス層に渡す | WebServer(C-08) |
| CC-05 | 冪等性 | 同一メモIDへの同一内容での更新は同じ結果を返す。バックアップは同一タイムスタンプでの重複実行を避ける | NoteStore, BackupService |

---

## 7. 設計原則の適用

### 7-1. 最小依存原則
本番依存は `express` `better-sqlite3` の2つのみを基本方針とする（Ollama連携はNode標準の`fetch`を使い追加パッケージを増やさない）。追加が必要になった場合はADRに理由を記載する。

### 7-2. アダプターパターン（Ollama）
Ollama呼び出しは`OllamaAdapter`（C-04）に集約し、他コンポーネントは直接HTTPを叩かない。Ollama自体が「キー不要・課金なし」の性質上、DRY_RUNモックの概念は「Ollama未検出時は検索ベースQAにフォールバックする」という形で代替する（本プロジェクトに課金・破壊的操作を伴う外部APIは存在しないため、golden-rules.md #3の「dry-runがない破壊的操作」には該当しない）。

### 7-3. キーオプショナル設計
APIキーは一切使用しない。Ollama自体の有無が「オプショナルな依存」に相当し、未導入でも全Must要件（検索ベースQA含む）が動作する設計とする（FR-EXT-001, FR-SYS-002）。

---

## 8. トレーサビリティマトリクス

| 要件ID | 設計コンポーネント | ADR | テストID | 状態 |
|---|---|---|---|---|
| FR-DATA-001〜005 | C-01 NoteStore | ADR-001, ADR-005 | TC-UNIT-01〜05 | 設計済 |
| FR-SYS-001 | C-02 SearchService | ADR-002 | TC-UNIT-06, TC-E2E-01 | 設計済 |
| FR-SYS-002 | C-03 QAService, C-02 | ADR-003 | TC-UNIT-07, TC-E2E-02 | 設計済 |
| FR-SYS-003 | C-03, C-04 OllamaAdapter | ADR-003 | TC-UNIT-08, TC-E2E-03 | 設計済 |
| FR-SYS-004 | C-03 QAService | ADR-003 | TC-UNIT-09, TC-E2E-05 | 設計済 |
| FR-DATA-006 | C-06 ExportService | ADR-005 | TC-UNIT-10 | 設計済 |
| FR-SYS-005 | C-05 BackupService | ADR-001 | TC-UNIT-11, TC-E2E-06 | 設計済 |
| FR-EXT-001 | C-04 OllamaAdapter | ADR-003 | TC-UNIT-12, TC-E2E-04 | 設計済 |
| FR-ADM-001 | C-07 ConfigManager | ADR-003 | TC-E2E-07 | 設計済 |
| NFR-PERF-001 | C-02 SearchService | ADR-002 | TC-PERF-01 | 設計済 |
| NFR-REL-001 | C-05 BackupService | ADR-001 | TC-E2E-06 | 設計済 |
| NFR-SEC-001 | C-08 WebServer | ADR-004 | TC-MANUAL-03 | 設計済 |

詳細は `docs/traceability_matrix.md` を参照。

---

## 9. ADR一覧

| ADR | タイトル | レベル |
|---|---|---|
| ADR-001 | Node.js + Express + better-sqlite3 を中核スタックとする | L1-不変 |
| ADR-002 | 日本語全文検索はFTS5 trigramトークナイザーを採用 | L2-慎重 |
| ADR-003 | 生成AIはOllama検出時のみ有効化する任意アダプターとする | L1-不変 |
| ADR-004 | 認証を実装せず127.0.0.1バインドのみで安全性を担保する | L2-慎重 |
| ADR-005 | メモ削除は物理削除とし論理削除は採用しない | L3-柔軟 |
| ADR-006 | フロントエンドはビルド不要の素のHTML/CSS/JSとする | L3-柔軟 |

各ADRの詳細は `docs/adr/` 配下を参照。
