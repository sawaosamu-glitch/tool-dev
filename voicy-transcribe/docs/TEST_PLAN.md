# テスト計画書（TEST_PLAN） — voicy-transcribe

準拠: IEEE 829

---

## 1. テスト計画ID
`TP-voicy-transcribe-v1.0`

## 2. 目的
SRS（`docs/SRS.md`）の全Must要件と主要Should要件が、SDD（`docs/SDD.md`）の設計通りに実装されていることを検証する。「動いているように見える」ではなく、自動テスト・実測により動作を証明する。

## 3. テスト対象
- C-03 UploadHandler / C-04 VoicyURLAdapter / C-05 TranscriptionEngine / C-06 SummarizationEngine / C-07 ResultStore / C-08 JobStore（全てユニット・統合テスト対象）
- JobAPI（`POST /api/jobs`, `GET /api/jobs/{id}`）（統合・E2Eテスト対象）
- WebUI（E2Eテストの一部として操作確認）

## 4. テスト対象外
- Voicy側の内部実装・可用性そのもの（外部サービスのため制御不可。取得失敗時の自システムの振る舞いのみテスト対象）
- 複数ユーザー同時アクセス時の負荷（自分専用ツールのため対象外、NFR未定義）
- モバイル/タブレットのUI（Later）

## 5. テストアプローチ（テストピラミッド）

| 層 | 対象 | 数の目安 |
|---|---|---|
| Unit | C-03〜C-08それぞれの正常系・異常系 | 各コンポーネント3〜6件（具体的なテストケースは`docs/test_cases.md`参照。Round1レビューF-006対応） |
| Integration | JobAPI経由の一連のフロー（アップロード→文字起こし→要約→保存） | 3〜5件 |
| E2E | ブラウザ操作を模したシナリオ（下記6+1件） | 7件 |
| Acceptance | `docs/acceptance_criteria.md` の全ACC-* | 全件 |
| Security | 通信ログにlocalhost以外への送信がないことの確認（NFR-SEC-001） | 1件 |
| Regression | 主要E2Eシナリオの再実行 | E2Eと共通 |
| Smoke | サーバー起動確認、`GET /health` 応答確認 | 1件 |

カバレッジ目標: Unit行カバレッジ80%以上、Integration主要フロー100%、E2E 7シナリオ100%。

## 6. Entry Criteria（テスト開始条件）
- [ ] SDDの設計が完了している（本ドキュメント作成時点で完了）
- [ ] `requirements.txt` に基づき依存関係がインストール可能
- [ ] Ollamaがローカルにインストールされ `ollama pull qwen3` 済み
- [ ] テスト用音声サンプル（後述）が準備済み

## 7. Exit Criteria（テスト終了条件）
- [ ] 全Must要件（FR-DATA-*, NFR-FUNC/PERF/REL/SEC-001）のテストがPASS
- [ ] コードカバレッジ80%以上
- [ ] Blocker/Mustの不具合がゼロ
- [ ] E2Eシナリオ7件全てPASS（またはYellow=境界値のみ許容、Red=正常系/異常系FAILは不可）

## 8. Suspension Criteria（テスト中断条件）
- Blocker不具合が3件以上同時発生
- テスト環境（Ollama起動等）が利用不能
- テスト用音声サンプルが破損・入手不可

## 9. テスト環境

| 項目 | 内容 |
|---|---|
| OS | macOS または Linux |
| ランタイム | Python 3.9+ |
| 依存プロセス | Ollama（`ollama serve`、モデル`qwen3`をpull済み） |
| テストデータ | `tests/fixtures/` に配置する日本語音声サンプル3種（短い/標準/長い）、不正ファイル1種 |
| DRY_RUN | VoicyURLAdapterのテストは `DRY_RUN=true` を既定とし、実際のVoicyサイトへはE2E一部のみ限定的にアクセスする |

## 10. テストスケジュール
Phase 6（実装）と並行してUnit/Integrationテストを実装し、Phase 7（検証）でE2E・Acceptance・Security・Smokeを実行する。

## 11. リスクと対策

| リスク | 対策 |
|---|---|
| Ollamaが未インストールでテストが全滅する | Ollama未接続時のテストは「要約なし」として続行できる設計（FR-DATA-003）のため、要約系テストのみFAILし他は影響を受けない |
| テスト用音声サンプルの著作権 | 自分で録音した音声、またはパブリックドメイン/CC0の音声のみを`tests/fixtures/`に使用する |
| faster-whisperの初回モデルダウンロードに時間がかかる | CI/ローカル初回実行前に事前ダウンロードしておく運用注記をREADMEに記載 |

## 12. 成果物
- 本テスト計画書（`docs/TEST_PLAN.md`）
- E2Eシナリオ（`docs/E2E_SCENARIOS.md`）
- テストコード（`tests/unit/`, `tests/integration/`, `tests/e2e/`）
- テスト結果レポート（`PROGRESS.md`に記録）

---

## P/G/E 3エージェント体制（本プロジェクトでの適用）

小規模な個人開発プロジェクトのため、Planner/Generator/Evaluatorは同一セッション内で役割を切り替えて実施する（別エージェントへの分割は行わない。過剰設計回避）。

| 役割 | 責務 | 成果物 |
|---|---|---|
| Planner | 本テスト計画・E2Eシナリオの設計 | `TEST_PLAN.md`, `E2E_SCENARIOS.md` |
| Generator | テストコード実装・実行 | `tests/` 配下 |
| Evaluator | 結果評価・GO/NO-GO提案 | `PROGRESS.md` のテスト結果セクション |

## 決定論的センサー

| # | センサー | コマンド | 合格基準 |
|---|---|---|---|
| S1 | テスト | `pytest --tb=short` | 全テストPASS |
| S2 | 型チェック | `mypy src/` | エラー0件 |
| S3 | リント | `ruff check src/` | エラー0件（警告は許容） |
| S4 | ビルド | `python -c "import src.main"` | 正常終了 |
| S5 | E2E | `pytest tests/e2e/` | 全シナリオPASS |
| S6 | セキュリティ | `bandit -r src/` | HIGH 0件 |

1つでもFAILなら次フェーズ（Phase 5レビュー）に進めない。

## CI実行戦略（Round1レビューF-008対応）

ホスト型CIランナーでOllama常駐・大型モデルのpull・faster-whisperモデルDLを毎回行うのは非現実的（時間・ディスク容量超過）なため、実行環境を明確に分離する。

| 層 | CI（GitHub Actions等）で実行 | ローカルのみで実行 |
|---|---|---|
| Lint (S3) / 型チェック (S2) / ビルド (S4) | ○ | - |
| Unit（Ollama/whisperモデル非依存部分） | ○ | - |
| Unit（`requires_model`マーク付き：実際にfaster-whisper/Ollamaを呼ぶもの） | - | ○ |
| Integration / E2E / Security (S6) | - | ○（実装者が実行、結果をPROGRESS.mdに記録） |

- pytestのカスタムマーク `@pytest.mark.requires_model` を実際にモデルを呼び出すテストに付与する
- CI実行コマンド: `pytest -m "not requires_model"`
- ローカル実行コマンド（フル）: `pytest`
- カバレッジ80%目標（NFR-MAINT-001）はローカルのフル実行結果を基準とする（CIのみでは対象外テストがあるため未達成に見えることがある点に注意）
