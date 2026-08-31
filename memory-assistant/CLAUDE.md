# memory-assistant — CLAUDE.md

## PART A: プロジェクト情報 ★毎セッション確認
- プロジェクト名: memory-assistant
- 目的(1文): 自分で集めたテキストメモを蓄積・全文検索し、質問すると出典付きで回答してくれる個人用ローカルナレッジベース
- 技術スタック: Node.js 18+ / Express / better-sqlite3(FTS5 trigram) / Ollama(任意・qwen3:4b既定)
- 現在フェーズ: 全Phase完了（Phase 0-8、条件付き承認）。運用フェーズへ移行。詳細はdocs/project_completion.md
- 現在セッション: 1

## PART B: 完了基準 (Definition of Done)
1. [x] 全Must機能が実装済み（SRS 7章のMust要件全件、docs/requirements_ledger.md参照）
2. [x] 全テスト通過（カバレッジ96.5%、目標80%以上）
3. [x] E2Eシナリオ全PASS（docs/E2E_SCENARIOS.md、9件PASS）
4. [x] セキュリティチェック完了（PART F全項目）
5. [x] スペックドリフトなし（発見した2件(IMPL-001/002)はドキュメント側を実装に合わせて即時修正済み）
6. [x] レビューGO判定（harness/review-log.md）
7. [x] PROGRESS.md最新

## PART C: 作業ルール
- 承認制: コード変更は必ず人間の確認を取る
- 1コミット1変更: 1つのコミットに複数の無関係な変更を含めない
- スペックドリフト防止: ドリフト発見時はSD-ALERT形式で即報告
- ファイルに書く: 会話での合意はその場でファイルに反映する

## PART D: 絶対禁止事項
- SQLiteファイル(data/*.db)への直接手動編集禁止（NoteStore経由のみ）
- テスト削除・改ざん禁止（テストが通らない場合は実装を修正する）
- force push禁止（変更履歴は保持する）
- SRS未記載機能の追加禁止（新機能はSRS追記→承認後に実装。画像対応はV2 DEFER、追加禁止）
- 外部課金API・外部送信の追加禁止（「完全無料・ローカル完結」はADR-001/ADR-003で不変制約）
- CONSTRAINTS.mdの無断変更禁止（変更は人間の承認後のみ）
- 50往復超のセッション継続禁止（→ harness/session-mgmt.md）

## PART E: セッション管理
- 開始時: PROGRESS.md読了 → 前回の続きから再開
- 終了時: PROGRESS.md更新 → git commit
- 50往復超: 即座にセッション切替（例外なし）

## PART F: セキュリティチェックリスト
- [ ] 認証なし・127.0.0.1バインドのみで待受（ADR-004）
- [ ] データ保護: SQLiteはローカルのみ、暗号化はV1スコープ外（DEFER）
- [ ] 外部連携: Ollama呼び出しはlocalhost:11434のみ、他の外部送信なし（NFR-SEC-001）
- [ ] 入力検証: 全HTTP入力をWebServer層(C-08)でバリデーション（CC-04）
- [ ] 依存パッケージ(express, better-sqlite3等)の脆弱性チェック済み（npm audit）

## PART G: 本番移行チェックリスト（Google SRE PRR準拠）
- [ ] アーキテクチャレビュー完了（docs/SDD.md）
- [ ] 容量計画: メモ1000件規模での性能確認（NFR-PERF-001）
- [ ] 監視・アラート: 個人ローカル用途のため対象外（理由をPhase 8で明記）
- [ ] ロールバック手順文書化済み（バックアップからの復元手順、SRS 11章）
- [ ] 運用ドキュメント完備（README.md）

## PART H: RYGゲート
- Green: 次フェーズへ進行OK。全チェック項目クリア
- Yellow: sandbox/PoCのみ許可。本番操作禁止。注意事項あり
- Red: 停止。再設計・再リサーチが必要。進行禁止

## PART I: スペック検証スケジュール
- 実装完了時: SD-02（受入条件検証）実行
- テスト変更時: SD-03（テスト改ざん検出）実行
- 詳細: → harness/spec-drift.md

## PART J: ハーネス設計
- dry-run: 本プロジェクトに破壊的な外部操作（課金・自動投稿等）は存在しない。唯一のリスクはローカルDB削除操作のため、DELETE操作前は確認ダイアログ必須（FR-DATA-004）
- rollback: backups/配下の直近7世代からの手動復元（SRS 11章）
- 操作ログ: logs/app.log + git log

## PART K: テスト計画概要
- Unit: NoteStore/SearchService/QAService/BackupService/OllamaAdapter個別
- Integration: WebServerルート経由のAPIテスト
- E2E: docs/E2E_SCENARIOS.md（正常系3、異常系2、境界系1）
- 詳細: → docs/TEST_PLAN.md

## PART L: 成長型ハーネス
- 知識蓄積・テンプレート進化はnagame-devパイプライン全体のLayer2/3で管理（本プロジェクト固有の対応不要）

## PART M: 変更履歴
| 版 | 日付 | 変更内容 |
|---|---|---|
| v1.0.0 | 2026-08-31 | 初版作成（Phase 3 SDD完了時点） |
