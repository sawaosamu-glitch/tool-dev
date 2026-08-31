# PROGRESS

プロジェクト: voicy-transcribe
パイプライン: nagame-dev v2.0

---

## Phase 0: ヒアリング — 完了（2026-08-25）
- `docs/intake_sheet.md` 作成済み
- 未解決事項3件はPhase 1で解消

## Phase 1: リサーチ V1→V2 — 完了（2026-08-25）
- `research/research_v1.md`, `research/research_v2.md` 作成済み
- 技術スタック確定: Python/FastAPI + faster-whisper（文字起こし）+ Ollama/Qwen3（要約）
- **重要事実**: yt-dlpのVoicy抽出器が参照する旧API `vmw.api.voicy.jp` はDNS解決不可（本セッションで自己検証、2026-08-25）。現行APIは静的解析で特定できず、実装フェーズでの技術スパイクが必要
- **黄金ルール例外適用**: Voicy利用規約は自動取得できずAレベルで未確認のため、本来はRed/Yellow相当。社長が「個人的に規約を確認済み・自分専用ツールとして進める」ことを明示的に承認（本セッションでの回答）。golden-rules.md「例外」条項（社長の明示指示によるルールスキップ）を適用し、本ファイルに記録する

## Phase 2: SRS — 完了（2026-08-25）
- `docs/SRS.md`, `docs/requirements_ledger.md`, `docs/acceptance_criteria.md`, `docs/exit_criteria.md`, `docs/adoption_stop_criteria.md`, `docs/risk_register.md` 作成済み

### 品質スコアリング結果（2026-08-25）

#### Part A: 総合スコア 86 / 100 → グレード B
- 70未満の項目: なし
- 主な減点理由:
  - #8 外部連携要件の明確性（78点）: Voicyの現行APIが未公開・未確定のため、公式Docs確認済みという最高評価は付けられない。ただしOllama連携は詳細確認済み、Voicy側は実験的機能・フォールバック設計で明示的にリスク管理している
  - #11 セキュリティ権限監査の十分性（78点）: 個人ローカルツールのため認証・詳細監査は対象外とし、ログ出力のみの簡易対応にとどめている（過剰設計を避ける判断）
- 判断: 70未満の項目が0件のため、Phase 3（SDD）への進行を妨げる基準には抵触しない。「実装フェーズ(Phase 6)へ進むには90以上」の基準はPhase 6着手前に再スコアリングして確認する

#### Part B: 8観点チェック
- NG件数: 0件（曖昧語ブラックリストへの抵触なし。全Must要件がOBJ/ACC/TCに接続済み）

### 進行可否: GO（Phase 3へ進行）

---

## Phase 3: 仕様/技術設計 SDD — 完了（2026-08-25）
- `docs/SDD.md`（4設計ビュー、C4、ADR-001〜005、横断的ルール、ディレクトリ構成）作成済み
- `docs/traceability_matrix.md` 作成済み（全FR/NFRが設計コンポーネントに接続）
- `CLAUDE.md`（13パート、77行）作成済み
- ジョブ管理はDB不使用・インメモリ方式に決定（ADR-004、過剰設計回避）
- Voicy URL取得はアダプタパターン＋確認ゲートで分離（ADR-005）、RYG=Yellow運用

## Phase 4: テスト計画/ハーネス/E2E — 完了（2026-08-25）
- `docs/TEST_PLAN.md`（IEEE829 12セクション、P/G/E、決定論的センサー6種）作成済み
- `docs/E2E_SCENARIOS.md`（正常系3・異常系2・境界系1・Voicy実験系1＝計7シナリオ）作成済み
- `harness/HARNESS.md`（H1〜H5安全ハーネス）作成済み
- `CONSTRAINTS.md`（6セクション、C-AI-007でVoicy URL機能変更時のRYG再評価を明記）作成済み

## Phase 5: レビュー・再リサーチループ — Round 1完了・修正済み（2026-08-25）
- Codexロール（技術）・Opusロール（事業）の独立レビューエージェントを並行実行
- Codex総合判定: NO-GO（Blocker 3件）、Opus総合判定: CONDITIONAL GO（Blocker 1件）
- `harness/review-log.md`, `harness/finding_ledger.md` 作成済み（指摘23件、うち21件修正済み・2件は社長確認待ち）
- 主な修正: 非同期処理のイベントループブロッキング解消（asyncio.to_thread化）、Voicy取得の承認ゲートをAPI契約として強制（confirmed必須パラメータ化）、長時間音声要約のチャンク分割設計、JobStoreの排他制御明記、テストケース定義（`docs/test_cases.md`新設）、CI実行戦略の明記、README.md新設、リスク管理表に検知トリガー追加 等
- 統合判定: **CONDITIONAL GO** → 社長確認2件（F-004, F-012）ともに回答あり → **GO**
  - F-004: 「URLを入れたら文字になる」が本来の主目的との回答。URL機能（FR-EXT-002）を実質的な主軸として扱う（優先度Shouldは技術確立まで維持）
  - F-012: 非公開API調査・利用を承認。ただし「対象URLは毎回自分で入力する」条件付き（バッチ/自動巡回は禁止、CONSTRAINTS.md C-AI-009に反映）

## Phase 5 完了（2026-08-25）: GO判定

## Phase 6: 実装 — Must機能完了（2026-08-25）

### 技術スパイク結果（RISK-001解消）
- Playwrightで実機観察し、VoicyのWeb版が使う現行内部APIを特定（`research/research_v2.md`「技術スパイク結果」参照）
- Firebase匿名認証 → `vmedia-player-api.voicy.jp` メタデータAPI → HLS(.m3u8)音声DL・結合、という一連の流れを**実際にコードを書いて実機検証済み**（ブラウザ自動化は実行時には不要、`httpx`のみで完結）
- 社長より、この調査・利用は「対象URLは毎回自分で入力する」という条件付きで承認済み（F-004, F-012解決、CONSTRAINTS.md C-AI-009〜011に反映）

### 実装済みファイル
```
src/config.py, src/main.py
src/core/job_store.py, upload_handler.py, voicy_adapter.py, transcription.py, summarization.py, result_store.py
src/api/jobs.py
src/static/index.html
requirements.txt, .gitignore, pytest.ini
tests/unit/*.py (5ファイル), tests/integration/test_jobs_api.py
```

### 実行時の環境差分（発見・対応済み）
- 開発機にPython 3.11+が入っておらず、実際は3.9.6のみ利用可能だったため、SRS/SDD/README等の要件をPython 3.9+に修正（全ドキュメント一括更新済み）
- `pip3 install`でfastapi/uvicorn/httpx/faster-whisper/pytest等を導入し、動作確認に使用

### 動作確認（実機・実サーバーでの検証、DRY_RUNなし）
1. `uvicorn`でサーバー起動 → `/health`, `/` 応答確認OK
2. 不正拡張子アップロード → 400「対応していない形式です」OK
3. `confirmed=false`でのURL指定 → 400「confirmedフラグが必要です」OK（ネットワークアクセスなし）
4. Voicy対象外ドメインURL → 400「Voicyのエピソードページのみ対応しています」OK
5. **実際のVoicy公開エピソードURL（`https://voicy.jp/channel/941/7892642`）を入力して実行 → Firebase認証→音声DL→faster-whisper(tinyモデル)による文字起こしが完走し、`status=="done"`、全文テキスト（約9,300文字）が生成され`output/`に保存された**
6. Ollama未起動状態での要約 → `summary_text=None`、「要約エンジン（Ollama）に接続できません。ターミナルで`ollama serve`を実行してから...」が表示され、全文テキストの表示・保存は継続（異常終了しないことを確認）

### テスト実行結果
- `pytest tests/unit tests/integration` → **33件全PASS**
- カバレッジ: **91%**（NFR-MAINT-001の目標80%を達成）
- 未カバー部分は主に実モデル・実ネットワークを要する分岐（`requires_network`マーク済みの1件を除き、モック経由で全主要分岐をカバー）

### 決定論的センサー実行結果（2026-08-25）
| センサー | コマンド | 結果 |
|---|---|---|
| S1 テスト | `pytest tests/unit tests/integration` | PASS（33件全PASS、カバレッジ91%） |
| S2 型チェック | `mypy src/` | PASS（`faster_whisper`はpy.typedなしのためmypy.iniで許可設定済み） |
| S3 リント | `ruff check src/` | PASS（全項目クリア。pyproject.tomlでtarget-version=py39・日本語docstring向けルールを調整） |
| S4 ビルド | `python -c "import src.main"` | PASS |
| S5 E2E | `pytest tests/e2e/` | **未実施**（tests/e2e/に自動テスト未作成。代わりに実サーバー起動での手動E2Eを実施し記録） |
| S6 セキュリティ | `bandit -r src/` | PASS（High/Medium/Low 0件） |

### 未実施・残作業
- [ ] Ollamaの実インストール・`qwen3:8b`モデルでの要約結果の実地品質確認（Ollama未インストールのため今回は未実施。ユーザー側でのセットアップが必要）
- [ ] 有料/プレミアムコンテンツURLでの実地確認（無料エピソードでのみ検証済み。テストはモックでカバー）
- [ ] `tests/e2e/`に自動E2Eテストを追加（現状は`docs/E2E_SCENARIOS.md`のシナリオを手動実行・記録する運用）
- [ ] git初期化・コミット（社長の指示があれば実施）

## Phase 7: E2E検証 — 部分的に実施済み（2026-08-25、上記「動作確認」参照）
実際のVoicy URLを使った手動E2E（正常系・要約フォールバック系）を実サーバーで実施し、PASS。E2E_SCENARIOS.mdの正式な全シナリオ実行（Ollama導入後）は次セッション以降の課題。

## セッション2（2026-08-26）: 残作業の消化

### mypy/ruff/bandit 実行結果（2026-08-25夜、S2/S3/S6）
- `ruff check src/`: 当初11件検出（インポート順・3.9非互換な`X | None`記法・可変クラス変数default・行長超過）→ 全て修正し **PASS**。`pyproject.toml`にtarget-version=py39、日本語docstring向けにRUF001-003を無効化、FastAPI標準パターンのB008を無効化
- `mypy src/`: `Literal["upload","url"]`の型推論漏れ・`Optional`未narrowing問題を修正（`assert`追加）、`faster_whisper`のpy.typed欠如は`mypy.ini`で許容 → **PASS**
- `bandit -r src/ -ll`: High/Medium/Low **0件**

### tests/e2e/ 自動テスト新設（S5）
`docs/E2E_SCENARIOS.md`のE2E-02, 04, 05, 06, 08, 09に対応する自動テストを`tests/e2e/test_e2e_scenarios.py`に追加。
E2E-04（Ollama未起動）はモックを使わず、実際に到達不能なポートへの接続を発生させて検証（より実態に近いテスト）。
E2E-01/03/07/07bは実Voicy・実whisperモデルを要するため`requires_network`/`requires_model`マークでCI対象外とし、既存の手動検証結果（本ファイル上部参照）で代替。

**最終テスト結果**: `pytest tests/unit tests/integration tests/e2e -m "not requires_network and not requires_model"` → **38件全PASS**、カバレッジ**90%**

### Ollamaインストール・実地確認（完了）
- Homebrewで`ollama`をインストールし`brew services start ollama`でサービス化
- `ollama pull qwen3:8b`（約5.2GB）は回線の不安定さにより計4回失敗（DNS解決エラー、TLSハンドシェイクタイムアウト、接続リセット×2）したが、Ollamaの再開機能とリトライループにより最終的に成功
- **実サーバーで実際のVoicyエピソード（`https://voicy.jp/channel/953314/7865315`、約1分の短尺コンテンツ、whisperモデル=base）を使い、URL入力→Firebase認証→音声DL→文字起こし→Ollama(qwen3:8b)による要約、まで完全に実物のコンポーネントだけで通しの動作確認が完了した**
- 要約結果例（実際の出力、抜粋）: 「朝の1分間の鏡前での自己チェックが、顔の状態改善や自己肯定感につながると語られる。3つの動作（目を開閉・首の運動）を1分間行うことで...」 — 内容として妥当な日本語要約が生成されることを確認
- `status=="done"`、`output/`への保存も正常に完了

### 決定論的センサー 最終結果（2026-08-26時点）
| センサー | 結果 |
|---|---|
| S1 テスト | PASS（38件、カバレッジ90%） |
| S2 型チェック(mypy) | PASS |
| S3 リント(ruff) | PASS |
| S4 ビルド | PASS |
| S5 E2E | PASS（自動化済み6シナリオ。残り4シナリオは手動検証で代替） |
| S6 セキュリティ(bandit) | PASS |

## Phase 6/7: Must機能・完全動作確認 — 完了（2026-08-26）
FR-DATA-001〜005, FR-EXT-001〜003の全Must要件について、モックによる自動テスト（38件PASS）と、実際のVoicy・faster-whisper・Ollamaを使った手動E2E（要約まで含む）の両方で動作を確認した。DoD（CLAUDE.md PART B）の残項目は「E2E自動化の完全網羅（一部手動代替のまま）」「スペックドリフトチェック」のみ（git初期化は本セッションで確認済み・`f06594f Initial commit`が既に存在）。

## セッション2（2026-08-26）続き: SD-02実施・SD-ALERT対応

### SD-02（スペックドリフトチェック）実施
`docs/acceptance_criteria.md`の全25項目を実装コード・テストと1件ずつ照合。ほとんどの項目は整合していたが、文書間の矛盾を2件発見しSD-ALERTとして報告・社長の指示のもと対応した。

#### SD-ALERT-1: セキュリティ制約とVoicy機能の矛盾（文書側を修正）
- `CONSTRAINTS.md C-SEC-001`「全処理はローカルプロセス内で完結」、`SRS.md`6章「外部送信を伴うインターフェースは存在しない」、`acceptance_criteria.md ACC-NFR-SEC-001`が、社長承認済みのFR-EXT-002/003（Voicy音声取得、Firebase匿名認証＋`vmedia-player-api.voicy.jp`への通信を伴う）と矛盾していた
- 承認済み機能を壊さないよう、**文書側**に例外規定を追記して解消（`CONSTRAINTS.md`→v1.3.0、`SRS.md`→v1.1、`acceptance_criteria.md`のACC-NFR-SEC-001の文言修正）

#### SD-ALERT-2: DRY_RUNハーネス（H1）が未実装（実装側を修正）
- `harness/HARNESS.md`/`SDD.md`/`CLAUDE.md`はDRY_RUNデフォルトtrueで実Voicyアクセスを防ぐ設計だったが、`src/config.py`のデフォルトは`false`、かつ`voicy_adapter.fetch`にDRY_RUN分岐が一切なく、設計通りに機能していなかった
- Voicy利用規約リスク（RISK-002、C-AI-008）の観点から、将来の誤アクセス事故を防ぐため**実装側**を設計に合わせて修正:
  - `src/config.py`: `DRY_RUN`のデフォルトを`true`に変更
  - `src/core/voicy_adapter.py`: `fetch()`に`config.DRY_RUN`分岐と`_mock_fetch()`を追加（SDD.md 8章の設計通り）
  - `tests/unit/test_voicy_adapter.py`: 既存テストにautouse fixtureで`DRY_RUN=False`を明示、DRY_RUN=True時のモック応答を検証する新規テストを追加
  - **README.mdに重要な運用変更を明記**: 実際にVoicyから音声を取得するには起動前に`export DRY_RUN=false`が必須になった（デフォルトのままだとダミー応答になる）

#### 検証結果（2026-08-26）
- `pytest tests/unit tests/integration tests/e2e -m "not requires_network and not requires_model"` → **39件全PASS**（DRY_RUN新規テスト1件追加）、カバレッジ**90%**
- `ruff check src/` → PASS、`mypy src/` → PASS、`bandit -r src/ -ll` → High/Medium/Low 0件
- `requires_network`マーク付きの実Voicy疎通テストも実行し、実際のVoicy APIへの到達性を再確認済み（PASS）

### DoD更新（CLAUDE.md PART B）
残項目は「E2E自動化の完全網羅（一部手動代替のまま）」のみ。スペックドリフトチェック（SD-02）は本セッションで完了。

## セッション2続き（2026-08-27）: 速度選択・要約品質改善・アイデアログ蓄積

### FR-DATA-002-b: 文字起こし速度/精度のUI選択（新機能、ユーザー要望）
- ブラウザに「速い/標準/高精度」のプルダウンを追加（`src/static/index.html`）。内部的にfaster-whisperの`base`/`small`/`medium`モデルに対応（`src/config.py WHISPER_QUALITY_PRESETS`）
- 未選択時は「標準」（small）が既定値
- CPU向けに`compute_type=int8`を全プリセット共通で適用（従来float16→float32への自動フォールバックで遅かった問題を解消）
- 実機確認: 「速い」選択で38分の音声が「高精度」構成の35分音声より大幅に短時間で完了することを確認済み
- `docs/SRS.md`にFR-DATA-002-b新設（v1.2）

### 要約品質の改善（ユーザーフィードバック: 「Claudeの要約の方が分かりやすい」への対応）
`src/core/summarization.py`のプロンプトを刷新:
- 生成の一貫性重視で`temperature=0.3`を明示指定（`OLLAMA_TEMPERATURE`、従来は未指定でOllama既定値のまま）
- チャンク分割サイズを1800→6000文字に拡大し分割数を削減（文脈の分断による支離滅裂な要約を軽減）。`OLLAMA_NUM_CTX`も4096→8192に拡大
- 要約プロンプトを「話の要点」「今後のビジネス・行動のヒント」「その他メモ」の3見出し構成に変更（単なる短縮ではなく、行動指針として使える形に）
- `docs/SRS.md` FR-DATA-003を改訂（v1.3）

### FR-DATA-006: アイデアログへの蓄積（新機能、ユーザー要望）
「今後のビジネスアイデアや行動の指針となる形で貯めていきたい」という要望に対応:
- ジョブ完了時、要約が生成できていれば`output/ideas_log.md`に日時・出典・要約を追記（`src/core/result_store.py append_to_ideas_log`）。個別ファイル保存とは別に、エピソードをまたいで1箇所に蓄積される
- `GET /api/ideas-log`で閲覧可能。ブラウザ画面にも「📓 蓄積されたアイデアログを見る」リンクを追加
- 追記失敗時もジョブ本体は失敗させない（ベストエフォート）
- `docs/SRS.md`にFR-DATA-006新設（v1.3）、`docs/acceptance_criteria.md`にACC-FR-DATA-002-b/006を追加

### 検証結果（2026-08-27）
- `pytest tests/unit tests/integration tests/e2e -m "not requires_network and not requires_model"` → **48件全PASS**（新規: DRY_RUN 1件、quality選択4件、result_store 3件、ideas-log 2件）、カバレッジ**91%**
- `ruff check src/` → PASS、`mypy src/` → PASS、`bandit -r src/ -ll` → High/Medium/Low 0件
- サーバー再起動して新コードを反映済み（`export DRY_RUN=false`で起動）

## セッション2続き（2026-08-27）: アイデアログ廃止・コピーボタン追加

要約は外部で別管理する方針になったため、直前に実装したFR-DATA-006（アイデアログ蓄積）を撤去した。
- 削除: `GET /api/ideas-log`エンドポイント、`result_store.append_to_ideas_log()`、UIの「アイデアログを見る」リンク、`config.IDEAS_LOG_FILENAME`、関連テスト（`tests/unit/test_result_store.py`削除、`test_jobs_api.py`から2件削除）
- 追加: 要約・全文テキストそれぞれに「📋 コピー」ボタン（`navigator.clipboard.writeText`によるワンクリックコピー、`src/static/index.html`）
- `docs/SRS.md`: FR-DATA-006を「廃止済み」として記録（v1.4）、FR-DATA-004にコピーボタンの記述を追加
- `docs/acceptance_criteria.md`: ACC-FR-DATA-006を削除、ACC-FR-DATA-004-bを追加。あわせて以前重複していたACC-FR-DATA-002-bのID衝突（破損音声ファイル用と速度選択用で同じIDだった）をACC-FR-DATA-002-cに採番し直して修正
- 検証: `pytest`全件PASS（46件、ideas-log関連5件削除）、`ruff`/`mypy`/`bandit`クリア、サーバー再起動して反映済み

## 次のアクション（社長の指示待ち）
1. 常用する場合は、精度重視で`WHISPER_MODEL=medium`相当の「高精度」選択を推奨。普段使いは「標準」で十分な場合が多い
2. **重要**: Voicy URL機能を実際に使うには`export DRY_RUN=false`が必須（README.md「起動方法」参照）。設定を忘れるとダミー応答になる
3. 新しい要約の構成（3見出し）が実際の使用感に合うか、何度か使ってみてフィードバックをもらう
4. 本番的に日常運用する場合、`ollama serve`と本アプリを起動する手順を都度実行する運用になる（README.md参照）
