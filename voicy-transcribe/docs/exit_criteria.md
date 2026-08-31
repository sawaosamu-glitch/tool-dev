# Exit Criteria表（フェーズ別）

| フェーズ | Exit Criteria | 判定方法 |
|---|---|---|
| Phase 0 ヒアリング | BUILD_TARGET・制約・成功条件・スコープ(IN/OUT/DEFER)が確定し、仮置きが5個以下 | intake_sheet.md確認 |
| Phase 1 リサーチ | V1/V2完了、技術スタック確定、外部API検証チェックリスト記入済み | research_v1/v2.md確認 |
| Phase 2 SRS | 品質スコアリングPart A 90点以上・Part B全項目OK、6つの必須成果物完成 | 本フェーズ末尾のスコアリング結果 |
| Phase 3 SDD | 4設計ビュー（論理/プロセス/データ/物理）完成、CLAUDE.md生成、トレーサビリティ接続済み | docs/SDD.md, CLAUDE.md確認 |
| Phase 4 テスト計画 | TEST_PLAN/E2E_SCENARIOS/HARNESS/CONSTRAINTS完成、全Must要件にTC-*接続 | 各ドキュメント確認 |
| Phase 5 レビュー | Blocker=0、RYGゲート判定完了（Red項目があれば対策済みまたは機能除外） | review-log.md確認 |
| Phase 6 実装 | SDD通りに実装完了、境界ケース8カテゴリ確認済み | ソースコード・PROGRESS.md確認 |
| Phase 7 検証 | `pytest`緑、E2E全PASS、スペックドリフト検出0件 | テスト結果・E2E_SCENARIOS.md確認 |
| Phase 8 本番移行 | 該当なし（自分専用ローカルツールのため本番移行なし。個人PC上での「利用開始」をもって完了とする） | PROGRESS.md確認 |
