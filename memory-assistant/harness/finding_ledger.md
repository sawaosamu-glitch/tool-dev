# 指摘事項台帳（Finding Ledger）

Round 1（Codex役: `harness/review_codex_r1.md` / Opus役: `harness/review_opus_r1.md`）の全指摘と対応状況。

| ID | Round | 優先度 | 内容 | 判定 | 対応状況 | 対応内容 |
|---|---|---|---|---|---|---|
| C-001 | R1 | Blocker | FR-SYS-004の低関連度ケースが未設計・未テスト | ACCEPT | Resolved | SDD QAService.isRelevant()追加、ACC-FR-SYS-004-2/TC-UNIT-09b/TC-E2E-05b追加 |
| C-002 | R1 | Blocker | NFR-FUNC-001/PERF-001がacceptance_criteria.mdに不在 | ACCEPT | Resolved | ACC-NFR-FUNC-001-1/ACC-NFR-PERF-001-1を新設 |
| C-003 | R1 | Blocker | FR-SYS-001「1文字以上」がtrigramの2文字未満非対応と矛盾 | ACCEPT | Resolved | SRS/ACC/8.4を「2文字以上」に修正、1文字時の案内文言を追加 |
| C-004 | R1 | Must | NFR-EXT-001のTC-E2E-ID誤り（06→07） | ACCEPT | Resolved | requirements_ledger.md, traceability_matrix.md訂正 |
| C-005 | R1 | Must | 自然文質問→FTS5クエリの変換アルゴリズム未定義 | ACCEPT | Resolved | SDD SearchService.buildFtsQuery()を追加定義 |
| C-006 | R1 | Must | created_at同値時のソート順不安定（flaky） | ACCEPT | Resolved | NoteStore.findAllを`ORDER BY created_at DESC, id DESC`に確定 |
| C-007 | R1 | Must | BackupService/ExportService/ConfigManager/NoteStore.update/delete未定義 | ACCEPT | Resolved | SDD 1章インターフェース定義に全関数追加 |
| C-008 | R1 | Must | バックアップ失敗が利用者に可視化されない | ACCEPT | Resolved | HARNESS.md H9追加、ACC-FR-SYS-005-3・SRS例外節・8.5異常系#6追加 |
| C-009 | R1 | Must | NFR-SEC-001が手動確認のみで自動検知がない | ACCEPT | Resolved | HARNESS.md H10・TC-UNIT-13追加 |
| C-010 | R1 | Must/Escalate | better-sqlite3同梱SQLiteのtrigram対応が未実機確認 | ACCEPT | Resolved | Phase 6実装環境（better-sqlite3 v13.0.3/SQLite 3.53.4）で実機確認済み、ADR-002を「確定」に更新 |
| C-011 | R1 | Must | Windows/Linuxの自動テストがなく手動確認のみ | ACCEPT | Resolved | TEST_PLAN Manual層にTC-MANUAL-04として明記済み。CI基盤導入は個人開発のためLater扱い（早期の手動確認1回追加で緩和） |
| C-012 | R1 | Should | 残り5件のNFRにACC-*行がない | ACCEPT | Resolved | acceptance_criteria.mdにNFR-COMP/USE/MAINT/PORT/EXT-001のACCを追加 |
| C-013 | R1 | Should | SRS 10章NFR表に優先度列がない | ACCEPT | Resolved | 優先度列を追加しledgerと一致させた |
| C-014 | R1 | Should | メモ編集に確認・版管理がなく削除より無防備 | MODIFY | Resolved | ADR-005追記で現状維持を意図的な判断として明記、README/SRSに制約を記載 |
| C-015 | R1 | Should | タグ絞込のLIKE実装が誤マッチする設計 | ACCEPT | Resolved | SDD 3章にカンマ境界方式のSQLを明記 |
| C-016 | R1 | Should | ACC粒度とTC-UNIT-IDの対応が粗い | HOLD | Resolved | Phase 6で実装：1つのTC-UNIT-IDは複数のtest()ケースの集合として扱う運用に決定し、実際に各ACC-*シナリオごとに個別のtest()を作成した（tests/unit/配下、計43件） |
| C-017 | R1 | Should | body上限がDB制約に含まれない | ACCEPT | Resolved | CHECK制約に上限を追加 |
| C-018 | R1 | Should/Escalate | node:testのモックAPIのNode18対応が未確認 | ACCEPT | Resolved | 開発機（Node v24.16.0）で`node:test`のmock APIが利用可能なことを確認済み。Node 18/20系での確認はTC-MANUAL-04に含めて後日実施 |
| C-019 | R1 | Should | Evidence ID対応表の不備・NFR-PORT-001の根拠ID不適切 | ACCEPT | Resolved | 対応表にA2追加、NFR-PORT-001をEV-B4/B5に差替 |
| C-020 | R1 | Later | config.jsonスキーマが複数文書に分散 | HOLD | Resolved | SDD 3章データビューにConfigエンティティのデフォルト値を集約記載 |
| C-021 | R1 | Later | backup()の非ブロッキング記述が誤解を招く | ACCEPT | Resolved | SDD 2章の記述を2レベルのブロッキングを区別する表現に修正 |
| C-022 | R1 | Later | npm auditの実行タイミングが未定義 | ACCEPT | Resolved | TEST_PLAN Exit Criteriaに明示的な合否条件として追加 |
| O-001 | R1 | Blocker | ヒアリング内容が本人未承認のまま設計が確定進行 | ESCALATE | Resolved（ゲート追加） | SRS 14章DoDに本人承認ゲートを追加。実装着手前に要旨提示・承認を得る運用とする |
| O-002 | R1 | Must | 核心の生成ベースQA体験の導入手順が皆無 | MODIFY | Resolved | README.mdに導入手順を明記、FR-UX-001（Could）でUI導線も追加 |
| O-003 | R1 | Must | DB復元手順がWAL/SHMファイルに触れていない | MODIFY | Resolved | SRS 11章・README.mdの復元手順にWAL/SHM削除ステップを追加、TC-MANUAL-05追加 |
| O-004 | R1 | Should | Node.js導入手順・ビルドツール導入手順が欠如 | MODIFY | Resolved | README.mdにNode.js導入手順とOS別トラブルシュート表を追加 |
| O-005 | R1 | Should | Qwen3ライセンスの根拠が一次情報未確認 | ACCEPT | Resolved | Hugging Face LICENSEファイルを直接確認しresearch_v2.mdを更新 |
| O-006 | R1 | Should | モデル変更時のライセンス警告がない | MODIFY | Resolved | README.mdにモデル変更時の注意書きを追加 |
| O-007 | R1 | Should | trigram検索の限界がエンドユーザー向けに未翻訳 | ACCEPT | Resolved | README.mdに平易な説明を追加 |
| O-008 | R1 | Should | CLAUDE.mdが存在しないharnessファイルを参照 | MODIFY | Resolved | harness/spec-drift.md, harness/session-mgmt.mdを新規作成 |
| O-009 | R1 | Should | 復元手順で社長操作とアプリ自動処理が混同 | MODIFY | Resolved | SRS 11章の文言を社長操作のみを主語にした表現に修正 |
| O-010 | R1 | Later | 大量メモ蓄積時の発見可能性課題 | HOLD | Backlog | scope_table.mdのDEFERリストに想起支援機能の検討候補として残す（次項参照） |

## Phase 6実装中に発見した追加指摘

| ID | Round | 優先度 | 内容 | 判定 | 対応状況 | 対応内容 |
|---|---|---|---|---|---|---|
| IMPL-001 | Phase6 | Must | Round 1修正で「2文字以上で検索可能」としたが、Phase 6実装環境での実機テストで2文字クエリは常に0件（trigramは3文字未満で構造上マッチ不可）と判明 | ACCEPT | Resolved | SRS/SDD/ACC/README/8.4節の最小文字数を全て「3文字以上」に統一。buildFtsQuery()を3文字幅スライディングウィンドウ抽出に確定 |
| IMPL-002 | Phase6 | Must | 実機のOllama(qwen3:8b)で生成ベースQAを実行したところ、既定の思考モード(thinking)により応答が10秒タイムアウトを超過しFR-SYS-003が常にフォールバックしてしまうことを実機テストで発見 | ACCEPT | Resolved | OllamaAdapter.generate()のリクエストに`think:false`を追加。実機検証で応答時間が約4秒→約0.3秒に短縮されタイムアウト内に収まることを確認 |

## Backlog（次フェーズ/V2以降に持ち越し）
- C-016: TC-UNIT-IDとACC粒度の対応方針をPhase 6着手時に決定
- O-010: 「最近見たメモ」「よく参照するメモ」等の想起支援機能をV2検討候補とする
