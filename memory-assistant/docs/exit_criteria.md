# Exit Criteria表

| フェーズ | Exit Criteria | 状態 |
|---|---|---|
| Phase 0 ヒアリング | BUILD_TARGET・制約・成功条件・スコープ(IN/OUT/DEFER)確定、社長承認 | 完了 |
| Phase 1 リサーチ | V1 3観点2ソース以上、V2で技術スタック確定、外部API検証チェックリスト記入済み | 完了 |
| Phase 2 SRS | 全14章記述、全FR/NFRにID・Given-When-Then・優先度付与、Must60%以下、品質スコアA(90+)かつ個別70未満0件 | 本ドキュメント作成後にPart A/B採点を実施 |
| Phase 3 SDD | 4設計ビュー(論理/プロセス/データ/物理)完備、CLAUDE.md生成、トレーサビリティ確立 | 未着手 |
| Phase 4 テスト計画/ハーネス | TEST_PLAN・HARNESS・E2E_SCENARIOS・CONSTRAINTS.md作成、カバレッジ目標80%明記 | 未着手 |
| Phase 5 レビュー | Blocker=0、全Must要件にAC・TC接続、RYGゲート判定完了 | 未着手 |
| Phase 6 実装 | SDD通りの実装完了、境界ケース8カテゴリ対応 | 未着手 |
| Phase 7 検証 | lint/test/build緑、E2E全PASS、スペックドリフト検出0件 | 未着手 |
| Phase 8 本番移行 | Google SRE PRRチェック完了、移行判定 | 未着手 |
