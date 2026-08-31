# テスト計画書（IEEE 829準拠） — memory-assistant

## 1. テスト計画ID
`TP-memory-assistant-v1.0`

## 2. 目的
SRS（docs/SRS.md）で定義した全Must要件が、SDD（docs/SDD.md）通りに実装されていることを、テストピラミッド全層で検証する。特に「根拠なき回答の拒否」（FR-SYS-004）と「データ消失防止」（NFR-REL-001）は本プロジェクトの中核リスクであるため重点的に検証する。

## 3. テスト対象
- NoteStore, SearchService, QAService, OllamaAdapter, BackupService, ExportService, ConfigManager（単体）
- WebServerの全REST API（結合）
- ブラウザUIからの一連の操作フロー（E2E）

## 4. テスト対象外
- Ollamaモデル自体の生成品質の定量評価（モデル任意選択のため主観評価はスコープ外。QAServiceの制御ロジック・フォールバック動作のみを検証対象とする）
- 画像機能（V1スコープ外のため対象外）
- マルチユーザー同時アクセス性能（単一ユーザー前提のため対象外）

## 5. テストアプローチ（テストピラミッド）

| 層 | 対象 | 目安件数 | 実行頻度 |
|---|---|---|---|
| Unit | 各サービスクラスの関数単位 | 44件（tests/unit/、TC-UNIT-01〜13の各ACC粒度をtest()単位に展開、BC-3文字コード境界1件含む） | コミット毎 |
| Integration | WebServer経由のAPIエンドポイント | 11件（tests/integration/、主要フロー+主要エラーパス） | 実装完了毎 |
| E2E | ブラウザ操作相当のシナリオ | 9件（tests/e2e/、docs/E2E_SCENARIOS.mdの7シナリオを実行、05/06は複数ケースに分割） | フェーズ完了前 |
| Performance | 検索応答時間 | 1件（TC-PERF-01） | 実装完了時 |
| Manual | ブラウザ実機・OS横断確認・復元手順の実地確認 | 5件（TC-MANUAL-01〜05） | リリース前 |
| Coverage | 全体カバレッジ計測 | 1件（TC-COVERAGE-01） | リリース前 |

### 手動確認項目一覧（Manual層の内訳）
| ID | 内容 |
|---|---|
| TC-MANUAL-01 | NFR-COMP-001: Node.js 18/20/22、Chrome/Firefox/Safari最新版での表示確認 |
| TC-MANUAL-02 | NFR-USE-001: 初回起動からメモ1件登録までの操作ステップ数確認 |
| TC-MANUAL-03 | NFR-SEC-001: リリース前の通信宛先パケットキャプチャ確認 |
| TC-MANUAL-04 | NFR-PORT-001: Windows/macOS/Linuxでのゼロベースセットアップ確認（Node.js未導入環境から実施し、README記載の手順のみで完了できるかを検証。Opus役指摘O-004対応） |
| TC-MANUAL-05 | SRS 11章の手動DB復元手順（WAL/SHMファイル削除を含む）を実際に実行し、破損DBから正常復元できることを確認（Opus役指摘O-003対応） |
| TC-MANUAL-06 | FR-UX-001（Could）: Ollama未検出時に導入ガイド導線が表示されることを確認（実装した場合のみ。未実装でもDoDには影響しない） |

## 6. Entry Criteria（テスト開始条件）
- [ ] docs/SDD.mdが完成している
- [ ] `npm install`でテスト対象コードがビルド・起動可能
- [ ] テストデータ（ダミーメモ生成スクリプト）が準備済み
- [ ] Ollama検出時/未検出時それぞれのテスト環境が用意できる（未検出テストはOllamaを停止した状態で実施）

## 7. Exit Criteria（テスト終了条件）
- [ ] 全Must要件のテストがPASS
- [ ] 単体テストの行カバレッジ80%以上
- [ ] Blocker/Mustの不具合がゼロ
- [ ] E2E_SCENARIOS.mdの7シナリオが全てPASS
- [ ] `npm audit`で高（High）/重大（Critical）脆弱性が0件（Codex役指摘C-022対応。リリース前チェックとして明示的な合否条件にする）

## 8. Suspension Criteria（テスト中断条件）
- Blocker不具合（データ消失・データ破損に直結するもの）が同時に3件以上発生した場合
- テスト環境（Node.js/npm）が利用不能な場合
- SQLiteファイルが繰り返し破損しテスト自体が継続できない場合

## 9. テスト環境
| 項目 | 内容 |
|---|---|
| OS | macOS（開発機）。Windows/Linuxは手動確認（TC-MANUAL-04）で代替 |
| ランタイム | Node.js 18 LTS以上 |
| テストフレームワーク | Node.js標準の`node:test` + `assert`（追加依存を増やさないため。ADR-001の最小依存原則に整合） |
| テストデータ | ダミーメモ生成スクリプト（`tests/fixtures/generateNotes.js`）で1〜1000件を生成可能にする |
| Ollama | 検出時テストはOllamaインストール済み環境、未検出時テストはOllamaプロセス停止状態で実施 |

## 10. テストスケジュール
| タイミング | 実施内容 | 担当 |
|---|---|---|
| 実装中（Phase 6） | Unit/Integrationテストを実装と並行して作成 | Claude Code（Generator役） |
| 実装完了直後 | 全Unit/Integrationテスト実行、カバレッジ計測 | Claude Code（Evaluator役） |
| Phase 7 | E2E 6シナリオ実行、性能テスト実行 | Claude Code（Evaluator役） |
| リリース前 | 手動確認4件（TC-MANUAL-01〜04） | 社長（人間） |

## 11. リスクと対策
| リスク | 対策 |
|---|---|
| Ollama環境がテスト実行機に無くOllama検出時のテストができない | OllamaAdapterをモック化した単体テストで代替し、実機能検証はE2E-03のみで実施 |
| trigram検索の精度がテストデータ次第で結果がぶれる | テストデータを固定シード・固定内容で生成し再現性を確保 |
| better-sqlite3のネイティブビルドがテスト環境で失敗する | Node.js LTSバージョンを明記し、CI相当の環境確認を事前に行う |

## 12. 成果物
- 本テスト計画書（`docs/TEST_PLAN.md`）
- E2Eシナリオ（`docs/E2E_SCENARIOS.md`）
- テストコード一式（`tests/unit/`, `tests/integration/`, `tests/e2e/`）
- テスト実行結果・カバレッジレポート（Phase 7で`PROGRESS.md`に記録）
