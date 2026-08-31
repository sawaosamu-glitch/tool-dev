# 要件ID台帳

| ID | タイトル | 優先度 | 状態 | Evidence ID | 設計ID | テストID |
|---|---|---|---|---|---|---|
| FR-DATA-001 | メモを新規登録する | Must | 確定 | EV-B1,EV-B3 | SDD-3.1 | TC-UNIT-01, TC-E2E-01 |
| FR-DATA-002 | メモの一覧を時系列で表示する | Must | 確定 | EV-C1 | SDD-3.1 | TC-UNIT-02 |
| FR-DATA-003 | メモを編集する | Must | 確定 | EV-B5 | SDD-3.1 | TC-UNIT-03 |
| FR-DATA-004 | メモを削除する | Must | 確定 | EV-B5 | SDD-3.1 | TC-UNIT-04 |
| FR-DATA-005 | タグでメモを絞り込む | Should | 確定 | - | SDD-3.1 | TC-UNIT-05 |
| FR-SYS-001 | メモを全文検索する | Must | 確定 | EV-A4 | SDD-3.2 | TC-UNIT-06, TC-E2E-01 |
| FR-SYS-002 | 検索ベースQAを返す | Must | 確定 | EV-C3 | SDD-3.3 | TC-UNIT-07, TC-E2E-02 |
| FR-SYS-003 | 生成ベースQAを返す | Should | 確定 | EV-A6,EV-C3 | SDD-3.3 | TC-UNIT-08, TC-E2E-03 |
| FR-SYS-004 | 根拠なき回答を拒否する | Must | 確定 | EV-C3 | SDD-3.3 | TC-UNIT-09, TC-UNIT-09b, TC-E2E-05, TC-E2E-05b |
| FR-DATA-006 | メモをエクスポートする | Should | 確定 | - | SDD-3.4 | TC-UNIT-10 |
| FR-SYS-005 | データを自動バックアップする | Must | 確定 | EV-C4 | SDD-3.5 | TC-UNIT-11, TC-E2E-06 |
| FR-EXT-001 | Ollamaの有無を検出する | Must | 確定 | EV-A6,EV-B7 | SDD-3.3 | TC-UNIT-12, TC-E2E-04 |
| FR-ADM-001 | 使用するOllamaモデルを設定する | Could | 確定 | - | SDD-3.3 | TC-E2E-07 |
| FR-UX-001 | Ollama未検出時に導入ガイド導線を表示する | Could | 確定 | - | SDD-3.6 | TC-MANUAL-06 |
| NFR-FUNC-001 | 検索インデックスの完全性 | Must | 確定 | EV-A4 | SDD-3.2 | TC-E2E-01 |
| NFR-PERF-001 | 検索応答500ms以内 | Must | 確定 | EV-C2 | SDD-3.2 | TC-PERF-01 |
| NFR-COMP-001 | Node.js/ブラウザ互換性 | Should | 確定 | EV-B4 | SDD-4 | TC-MANUAL-01 |
| NFR-USE-001 | 初回登録3ステップ以内 | Should | 確定 | EV-C5 | SDD-3.1 | TC-MANUAL-02 |
| NFR-REL-001 | 再起動時のデータ非損失 | Must | 確定 | EV-C4 | SDD-3.5 | TC-E2E-06 |
| NFR-SEC-001 | 外部送信なし | Must | 確定 | EV-B9 | SDD-4 | TC-UNIT-13, TC-MANUAL-03 |
| NFR-MAINT-001 | 単体テストカバレッジ80% | Should | 確定 | - | SDD-5 | TC-COVERAGE-01 |
| NFR-PORT-001 | 3OSでのセットアップ容易性 | Should | 確定 | EV-B4,EV-B5 | SDD-4 | TC-MANUAL-04 |
| NFR-EXT-001 | モデル切替の容易性 | Could | 確定 | - | SDD-3.3 | TC-E2E-07 |

Evidence ID対応表:
- EV-A2 = research/v1_A_tools.md A2（better-sqlite3詳細：Star数・メンテ状況・ライセンス）
- EV-A4 = research/v1_A_tools.md A4（FTS5 trigram tokenizer）
- EV-A6 = research/v1_A_tools.md A6（Ollama概要）
- EV-B1/B3/B4/B5/B7/B9 = research/v1_B_api.md 該当項目（B4=メンテ状況, B5=FTS5対応確認, B9=完全ローカル動作確認）
- EV-C1/C2/C3/C4/C5 = research/v1_C_arch.md 該当項目

## Round 1レビュー修正履歴（2026-08-31）
- FR-SYS-004にテストID`TC-UNIT-09b`・`TC-E2E-05b`を追加（低関連度・非ゼロ件ケースの拒否ロジック検証、Codex役指摘C-001）
- NFR-SEC-001にテストID`TC-UNIT-13`を追加（外部送信の自動検知テスト、Codex役指摘C-009）
- NFR-PORT-001のEvidence IDを`EV-A2`→`EV-B4,EV-B5`に訂正（Codex役指摘C-019）
- NFR-EXT-001のテストIDを`TC-E2E-06`→`TC-E2E-07`に訂正（Codex役指摘C-004、traceability_matrix.mdとの参照誤りが一致していた）
