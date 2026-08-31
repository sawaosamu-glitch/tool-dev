# 設計書（SDD） — voicy-transcribe

準拠: IEEE 1016（4設計ビュー）

---

## 1. 論理ビュー（コンポーネント構成）

### コンポーネント一覧

| ID | コンポーネント名 | 責務 | 依存先 | 対応要件 |
|---|---|---|---|---|
| C-01 | WebUI | ブラウザ画面の提供、ユーザー操作の受付 | C-02, C-07 | FR-DATA-004, FR-SYS-001, 8章 |
| C-02 | JobAPI | ジョブ作成・状態照会のHTTPエンドポイント | C-03, C-04, C-05, C-06, C-07 | 全FR |
| C-03 | UploadHandler | 音声ファイルの受領・拡張子/サイズ検証・一時保存 | なし | FR-DATA-001 |
| C-04 | VoicyURLAdapter | Voicy URLからの音声取得（技術スパイクで実装方式確定済み。Firebase匿名認証→メタデータAPI→HLSセグメントDL・結合） | 外部: Voicy API (vmedia-player-api.voicy.jp), Firebase Auth | FR-EXT-001, FR-EXT-002, FR-EXT-003 |
| C-05 | TranscriptionEngine | faster-whisperによる音声→全文テキスト変換（同期処理を`asyncio.to_thread`でオフロード） | C-03/C-04の出力 | FR-DATA-002 |
| C-06 | SummarizationEngine | Ollama経由でのテキスト要約（長文はチャンク分割してmap-reduce要約、同期HTTP呼び出しは`asyncio.to_thread`でオフロード） | 外部: Ollama(localhost) | FR-DATA-003 |
| C-07 | ResultStore | 結果の保存（Markdown）とジョブ状態管理 | ファイルシステム | FR-DATA-005, FR-SYS-001 |
| C-08 | JobStore | ジョブの状態（インメモリ）を保持 | なし | FR-SYS-001 |

### コンポーネント間の依存関係

```
WebUI(C-01)
  → JobAPI(C-02)
       → UploadHandler(C-03) ─┐
       → VoicyURLAdapter(C-04) ┤→ TranscriptionEngine(C-05) → SummarizationEngine(C-06) → ResultStore(C-07)
                                                                                              ↓
                                                                                         JobStore(C-08) ← WebUIがポーリング
```

### インターフェース定義（要約）

| コンポーネント | 入力 | 出力 | エラー時の振る舞い |
|---|---|---|---|
| C-03 UploadHandler | UploadFile | ローカルファイルパス | 拡張子/サイズ不正時は `ValidationError` を送出 → JobStoreにerror状態を記録 |
| C-04 VoicyURLAdapter | Voicy URL文字列、`confirmed: bool`（利用者の同意フラグ） | ローカルファイルパス or `None`（取得失敗・プレミアムコンテンツ） | `confirmed=False` の場合はネットワークアクセスを一切行わず `PermissionError` を送出する（JobAPIが400を返す）。`is_premium`/`is_paystory`が`true`の場合は取得せず`PremiumContentError`を送出（JobAPIが`fallback_required`にする）。それ以外の取得失敗は例外を投げず `None` を返す（呼び出し側がフォールバック分岐） |
| C-05 TranscriptionEngine | 音声ファイルパス | 全文テキスト（str） | デコード不能時は `TranscriptionError` を送出。呼び出しは `await asyncio.to_thread(transcribe, path)` で行い、イベントループをブロックしない |
| C-06 SummarizationEngine | 全文テキスト（str） | 要約テキスト（str）or `None` | Ollama接続不可・タイムアウト時は `None` を返し、全文表示は継続。呼び出しは `await asyncio.to_thread(summarize, text)` で行う |
| C-07 ResultStore | 全文+要約+メタ情報 | 保存先パス（str） | 書き込み失敗時は例外をログに記録し画面表示は継続 |

---

## 2. プロセスビュー（処理フロー・並行性）

### メインフロー（非同期ジョブ方式）

1. ブラウザから `POST /api/jobs`（ファイル添付 or `{url, confirmed}`）
   - 入力がURLの場合、`confirmed=true` が明示されていなければ **JobAPIは即座に400を返し、ジョブを作成しない**（F-002対応。UI上の確認表示は「見せるだけ」ではなく、この`confirmed`フラグとしてサーバーに送信される契約とする）
2. JobAPIが `asyncio.Lock` を取得した上でJobStoreの状態を確認し、実行中ジョブがなければジョブを作成（状態: `queued`）して即座に `job_id` を返す。実行中ジョブがある場合は429を返す（ロック取得からジョブ作成までを単一のクリティカルセクションとし、同時リクエストでの二重作成を防ぐ。F-005対応）
3. バックグラウンドタスク（`BackgroundTasks`から起動）として以下を順に実行し、都度JobStoreの状態を更新する。**C-05/C-06のCPU/IOバウンドな呼び出しは全て`asyncio.to_thread`でワーカースレッドにオフロードし、Uvicornのイベントループをブロックしない**（F-001対応）
   1. 入力がURLの場合: `fetching_audio` → VoicyURLAdapter実行 → 失敗時は `fallback_required` 状態にして処理停止（ユーザーに手動アップロードを促す）
   2. 入力がファイルの場合: UploadHandlerで検証・保存
   3. `transcribing` → `await asyncio.to_thread(TranscriptionEngine.transcribe, path)`
   4. `summarizing` → `await asyncio.to_thread(SummarizationEngine.summarize, text)`（失敗・タイムアウトしても続行）
   5. ResultStoreで保存 → `done`
4. ブラウザは `GET /api/jobs/{job_id}` を2秒間隔でポーリングし、状態と結果を画面に反映する。イベントループがブロックされないため、処理中でもこのポーリングは即座に応答する

### 並行処理

- 単一ユーザー・単一ジョブ前提のため、ジョブの並列実行は設計しない（同時に2ジョブ目が来た場合はキューイングせず、直前のジョブが終わるまで新規受付を拒否する = 429応答）。ジョブ作成の排他は`asyncio.Lock`で保証する（上記2参照）
- FastAPIの `BackgroundTasks` で1ジョブを非同期実行し、HTTPリクエスト自体は即座に返す。ただしタスク内部の同期処理（faster-whisper/Ollama呼び出し）は必ず`asyncio.to_thread`でスレッドに逃がすこと。これを怠るとサーバー全体が処理中応答不能になる（Round1レビューF-001で発見）

### エラーハンドリングフロー

- VoicyURLAdapter失敗 → 例外にせず `None` を返却 → JobAPIが `fallback_required` 状態にしてUIへ案内文言を返す（FR-EXT-002の例外仕様通り）
- Ollama未接続 → `summarizing` 失敗を記録するが `error` にはせず `done`（要約なし）として扱う（FR-DATA-003の例外仕様通り）
- 予期しない例外 → JobStoreを `error` 状態にし、例外メッセージ（ユーザー向けに簡略化）を保持。スタックトレースは `logs/app.log` にのみ出力する

### VoicyURLAdapterの実装方式（技術スパイク確定、research_v2.md追記参照）

1. Voicy URL（`https://voicy.jp/channel/{channel_id}/{story_id}`）から`channel_id`・`story_id`を正規表現で抽出する
2. Firebase匿名認証: `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_WEB_API_KEY}` に `{"returnSecureToken": true}` を送り `idToken` を取得する（`FIREBASE_WEB_API_KEY`は環境変数化し、ハードコードしない。CC-03準拠）
3. メタデータ取得: `GET https://vmedia-player-api.voicy.jp/v1/channels/{channel_id}/stories/{story_id}` を `Authorization: Bearer {idToken}` 付きで呼ぶ
4. レスポンスの `is_premium` または `is_paystory` が `true` の場合、**取得を中止し `PremiumContentError` を送出する**（有料コンテンツは非対応。CONSTRAINTS.md C-AI-010）
5. `chapters[].voice.file` の各HLS URL(`.m3u8`)について、プレイリストを取得し `.aac` セグメントURLを（相対パスをHLS URLのベースに対して解決して）順に取得する
6. 全チャプターの全セグメントをchapter順・セグメント順に結合し、`work/{job_id}/audio.aac` として保存する
7. 本処理はPythonの`httpx`等によるHTTP呼び出しのみで完結し、ブラウザ自動化（Playwright等）は実行時には不要（技術スパイクの調査時のみ使用した）

### 長時間音声の要約設計（コンテキスト長対策、F-003対応）

60分の音声は全文テキストが数千〜1万字を超える可能性があり、Ollamaの既定コンテキスト長（`num_ctx`既定2048程度）を超えると入力が黙って切り詰められる、またはCPU推論でSRS EXT-4のタイムアウト（120秒）を超過するリスクがある。以下の設計で対応する。

1. 全文テキストを約1500〜2000文字（日本語）単位でチャンク分割する
2. 各チャンクをOllamaに要約させる（チャンクごとにタイムアウト120秒を適用）
3. チャンク要約群を結合し、全体が一定文字数（目安2000字）を超える場合はさらに要約させる（map-reduce方式、最大2段）
4. いずれかの段階でタイムアウト・接続エラーが発生した場合、その時点までに得られたチャンク要約を結合した簡易要約を返す。1件も要約できなければFR-DATA-003の例外仕様通り「要約なし」として扱う（`summary_text = None`）
5. Ollama呼び出し時は `num_ctx` をチャンクサイズに応じて明示指定する（環境変数 `OLLAMA_NUM_CTX`、既定4096）

---

## 3. データビュー（データモデル・フロー）

### データモデル

| エンティティ | 属性 | 型 | 制約 |
|---|---|---|---|
| Job | id, status, input_type, input_ref, created_at, error_message | str(UUID), enum, enum(upload/url), str, datetime, str\|None | status ∈ {queued, fetching_audio, transcribing, summarizing, done, fallback_required, error} |
| Result | job_id, transcript_text, summary_text, output_path | str(FK), str, str\|None, str | job_id: Jobに1:1で従属 |

### 保存方式

- ジョブ状態（Job/Result）: **インメモリ辞書**（プロセス内、DB不使用）。理由はADR-004参照
- 音声ファイル: `work/{job_id}/` にローカル保存
- 文字起こし・要約結果: `output/{タイムスタンプ}_{元ファイル名}.md`（SRS DATA-002準拠）
- ログ: `logs/app.log`

### データライフサイクル

- ジョブ状態: プロセス終了（サーバー停止）で消える。結果ファイルは `output/` に残るため実質的な永続化は完了済みファイルが担う
- 自動削除なし。個人利用のため利用者が `work/` を手動でクリーンアップする運用とする

---

## 4. 物理ビュー（デプロイ構成）

### 実行環境

| 項目 | 内容 |
|---|---|
| OS | macOS / Linux（Windowsは対象外・Later） |
| ランタイム | Python 3.9+ |
| 外部プロセス依存 | Ollama（`ollama serve` が `localhost:11434` で起動し、`ollama pull qwen3:8b` 済みであること） |
| 音声デコード依存 | faster-whisperはPyAV経由で音声デコードを行うため、通常はシステムへの追加ffmpegインストールは不要。ただし環境によっては必要になる場合があるため、実装時に実機確認しREADME.mdに記載する（F-017対応、断定を避ける） |
| Voicy URL取得の追加依存 | なし。技術スパイクの結果、実行時はHTTPクライアント（`httpx`）のみで完結することが確定した（ブラウザ自動化は不要）。`NFR-COMP-001`への影響なし（F-007解決） |
| Firebase Web APIキー | `FIREBASE_WEB_API_KEY`環境変数として設定（Voicy Web版が匿名認証に使う公開キーであり秘密情報ではないが、CC-03に従い設定値として外出しする） |

### デプロイ方法

- `pip install -r requirements.txt` → `uvicorn src.main:app --reload` でローカル起動（`http://localhost:8000`）
- Docker化はCould/Later（NFR-PORT-001参照）

### 非機能要件との対応

| ISO 25010特性 | 本設計での対応 |
|---|---|
| 性能効率性 | faster-whisperの `medium` モデル、Ollamaは`qwen3:8b`タグを既定とし、CPU実行を前提に設計（NFR-PERF-001、F-018対応：具体的なモデルタグを明記） |
| セキュリティ | 全通信はlocalhost内（WebUI⇄JobAPI⇄Ollama）。外部送信コードを含めない（NFR-SEC-001） |
| 保守性 | C-01〜C-08を疎結合にし、各コンポーネントを個別にユニットテスト可能にする（NFR-MAINT-001） |
| 拡張性 | 音声取得はC-03/C-04のアダプタパターンで分離。新しい取得方式はC-04と同インターフェースで追加可能（NFR-EXT-001） |

---

## 5. C4モデル

### Container図

| Container | 技術 | 責務 |
|---|---|---|
| Web App | Python / FastAPI / Uvicorn | UI提供、ジョブ管理、処理オーケストレーション |
| Ollama（外部プロセス） | Ollama（別プロセス、localhost:11434） | 要約用LLM推論 |
| File Storage | ローカルファイルシステム | 音声・結果ファイルの保存 |

### Component図（Web App内部）

| Component | 責務 | 公開API/関数 |
|---|---|---|
| JobAPI | HTTPエンドポイント | `POST /api/jobs`, `GET /api/jobs/{id}` |
| UploadHandler | ファイル検証・保存 | `save(upload_file) -> Path` |
| VoicyURLAdapter | URL音声取得（実験的） | `fetch(url, confirmed: bool) -> Path \| None` |
| TranscriptionEngine | 文字起こし | `transcribe(path) -> str`（呼び出し側で`asyncio.to_thread`使用） |
| SummarizationEngine | 要約（チャンク分割対応） | `summarize(text) -> str \| None`（呼び出し側で`asyncio.to_thread`使用） |
| ResultStore | 結果保存 | `save(job) -> Path` |
| JobStore | 状態管理（`asyncio.Lock`で排他） | `create()`, `update(id, ...)`, `get(id)` |

---

## 6. ADR（Architecture Decision Record）

### ADR-001: バックエンド言語・フレームワークにPython + FastAPIを採用

- **状態**: 承認
- **決定**: バックエンドをPython 3.9+ / FastAPIで実装する
- **理由**: 文字起こしライブラリ（faster-whisper）がPython製であり、言語統一で連携コストを下げる。FastAPIは非同期処理とバックグラウンドタスクの標準サポートがあり、進捗ポーリングUIと相性が良い
- **代替案**: Flask（非同期サポートが弱い）、Node.js（faster-whisperとの連携に追加ブリッジが必要）→ いずれも不採用
- **変更禁止レベル**: L2-慎重
- **影響を受ける要件**: 全FR

### ADR-002: 文字起こしエンジンにfaster-whisperを採用

- **状態**: 承認
- **決定**: 音声文字起こしにfaster-whisper（ローカル実行）を採用する
- **理由**: 無料・ローカル完結（NFR-SEC-001/課金リスク解消）、MITライセンス、日本語の実装実績あり（research_v2.md参照）
- **代替案**: OpenAI Whisper API（高精度だが従量課金＝Q6のリスクに抵触）、openai/whisper オリジナル実装（faster-whisperより低速）→ 不採用
- **変更禁止レベル**: L2-慎重
- **影響を受ける要件**: FR-DATA-002, NFR-FUNC-001, NFR-PERF-001, NFR-SEC-001

### ADR-003: 要約エンジンにOllama + Qwen3を採用

- **状態**: 承認
- **決定**: 要約処理にローカルOllama（Qwen3モデル）を採用する
- **理由**: 無料・ローカル完結、Apache2.0ライセンスで商用利用も可
- **代替案**: OpenAI API（課金リスク）、要約機能なし（MVP要件Q3を満たさない）→ 不採用
- **変更禁止レベル**: L2-慎重
- **影響を受ける要件**: FR-DATA-003, NFR-SEC-001

### ADR-004: ジョブ状態管理にDBを使わずインメモリ辞書を採用

- **状態**: 承認
- **決定**: JobStoreはSQLite等のDBを使わず、プロセス内のインメモリ辞書で実装する
- **理由**: 単一ユーザー・単一プロセスのローカルツールであり、サーバー再起動間での状態永続化は不要。DB導入は本プロジェクト規模では過剰設計
- **代替案**: SQLite（永続化できるが個人利用では過剰）→ 不採用
- **変更禁止レベル**: L3-柔軟（将来、複数ジョブの永続キューが必要になれば見直し可）
- **影響を受ける要件**: FR-SYS-001

### ADR-005: Voicy音声取得はアダプタパターン＋確認ゲートで分離実装

- **状態**: 承認
- **決定**: VoicyURLAdapterを他コンポーネントから独立させ、`fetch(url, confirmed: bool)` のように**同意の有無をAPI契約として必須パラメータ化**する（UI上の確認表示だけに頼らない）。`confirmed=False` はネットワークアクセス前に拒否する。取得失敗時は例外にせず `None` を返し、呼び出し側がFR-DATA-001の手動アップロードへ自動フォールバックする
- **理由**: 黄金ルール#3（dry-runがない破壊的・外部アクセス操作はRed）に対応。Round 1レビュー（F-002）で、UI表示のみの確認ゲートはAPIを直接叩けばバイパス可能と指摘されたため、サーバー側で強制する契約に修正した。技術スパイク完了によりRISK-001（実装方式未確定）は解消したが、失敗を前提にした設計（フォールバック）は外部サービス依存の安全設計として維持する（Voicy側の仕様変更で将来動かなくなる可能性は残るため）
- **代替案**: URL取得を必須機能にする（MVPが規約・技術リスクに引きずられるため不採用）
- **変更禁止レベル**: L2-慎重
- **影響を受ける要件**: FR-EXT-001, FR-EXT-002, RISK-001, RISK-002

---

## 7. 横断的ルール（Cross-Cutting Concerns）

| # | ルール | 内容 | 適用範囲 |
|---|---|---|---|
| CC-01 | エラーハンドリング | 外部呼び出し（Ollama, Voicy）は例外を握りつぶさず、JobStoreに状態として記録する | C-04, C-06 |
| CC-02 | ログ出力 | 処理開始/状態遷移/エラーを `logs/app.log` に出力。音声内容の本文はログに含めない | 全コンポーネント |
| CC-03 | 設定値管理 | モデル名・タイムアウト・`FIREBASE_WEB_API_KEY`等は環境変数（`WHISPER_MODEL`, `OLLAMA_MODEL`, `OLLAMA_NUM_CTX`, `FIREBASE_WEB_API_KEY`等）で管理し、ハードコード禁止 | 全コンポーネント |
| CC-04 | 入力バリデーション | UploadHandler/VoicyURLAdapterの入力は必ず検証してから後段に渡す | C-03, C-04（境界コンポーネント） |
| CC-05 | 冪等性 | 同一音声ファイルを再実行した場合、同一の文字起こし結果が得られること（要約はLLMの非決定性を許容） | C-05, C-07 |

---

## 8. アダプターパターン + DRY_RUN設計

- VoicyURLAdapterは他の外部送信アダプタと同様のインターフェース（`fetch(url) -> Path | None`）で実装し、将来的な取得方式の差し替えを容易にする
- 本プロジェクトは外部有料APIを使わないため、DRY_RUN切り替え（`DRY_RUN=true`でモック応答）は主にVoicyURLAdapterのテスト用に限定して適用する（実際のネットワークアクセスなしに単体テストできるようにするため）

```python
class VoicyURLAdapter:
    def fetch(self, url: str, confirmed: bool) -> Path | None:
        if not confirmed:
            raise PermissionError("confirmed=False: ユーザー同意なしにVoicyへアクセスしない")
        if os.environ.get("DRY_RUN") == "true":
            return self._mock_fetch(url)
        return self._real_fetch(url)
```

---

## 9. ディレクトリ構成

```
voicy-transcribe/
├── src/
│   ├── main.py                 # FastAPIエントリポイント
│   ├── api/
│   │   └── jobs.py             # JobAPI（C-02）
│   ├── core/
│   │   ├── job_store.py        # C-08
│   │   ├── upload_handler.py   # C-03
│   │   ├── voicy_adapter.py    # C-04
│   │   ├── transcription.py    # C-05
│   │   ├── summarization.py    # C-06
│   │   └── result_store.py     # C-07
│   ├── static/                 # WebUI（C-01）: index.html, app.js, style.css
│   └── config.py               # 環境変数管理
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── work/                        # 一時音声ファイル（.gitignore対象）
├── output/                      # 文字起こし・要約結果（.gitignore対象）
├── logs/                        # ログ（.gitignore対象）
├── research/
├── docs/
├── harness/
├── CLAUDE.md
├── CONSTRAINTS.md
├── PROGRESS.md
├── README.md                    # セットアップ手順・トラブルシューティング（F-013対応、必須成果物）
└── requirements.txt
```

---

## 10. トレーサビリティマトリクス

`docs/traceability_matrix.md` を参照。
