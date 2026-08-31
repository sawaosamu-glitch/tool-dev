# トレーサビリティマトリクス

| 要件ID | Evidence ID | 設計コンポーネント | ADR | テストID | 状態 |
|---|---|---|---|---|---|
| FR-DATA-001 | EV-B1,EV-B3 | C-01 NoteStore | ADR-001 | TC-UNIT-01, TC-E2E-01 | 設計済 |
| FR-DATA-002 | EV-C1 | C-01 NoteStore | ADR-001 | TC-UNIT-02 | 設計済 |
| FR-DATA-003 | EV-B5 | C-01 NoteStore | ADR-001, ADR-005 | TC-UNIT-03 | 設計済 |
| FR-DATA-004 | EV-B5 | C-01 NoteStore | ADR-005 | TC-UNIT-04 | 設計済 |
| FR-DATA-005 | - | C-01 NoteStore | ADR-001 | TC-UNIT-05 | 設計済 |
| FR-SYS-001 | EV-A4 | C-02 SearchService | ADR-002 | TC-UNIT-06, TC-E2E-01 | 設計済 |
| FR-SYS-002 | EV-C3 | C-03 QAService | ADR-003 | TC-UNIT-07, TC-E2E-02 | 設計済 |
| FR-SYS-003 | EV-A6,EV-C3 | C-03 QAService, C-04 OllamaAdapter | ADR-003 | TC-UNIT-08, TC-E2E-03 | 設計済 |
| FR-SYS-004 | EV-C3 | C-03 QAService | ADR-003 | TC-UNIT-09, TC-UNIT-09b, TC-E2E-05, TC-E2E-05b | 設計済 |
| FR-DATA-006 | - | C-06 ExportService | ADR-005 | TC-UNIT-10 | 設計済 |
| FR-SYS-005 | EV-C4 | C-05 BackupService | ADR-001 | TC-UNIT-11, TC-E2E-06 | 設計済 |
| FR-EXT-001 | EV-A6,EV-B7 | C-04 OllamaAdapter | ADR-003 | TC-UNIT-12, TC-E2E-04 | 設計済 |
| FR-ADM-001 | - | C-07 ConfigManager | ADR-003 | TC-E2E-07 | 設計済 |
| NFR-FUNC-001 | EV-A4 | C-02 SearchService | ADR-002 | TC-E2E-01 | 設計済 |
| NFR-PERF-001 | EV-C2 | C-02 SearchService | ADR-002 | TC-PERF-01 | 設計済 |
| NFR-COMP-001 | EV-B4 | C-08 WebServer | ADR-001 | TC-MANUAL-01 | 設計済 |
| NFR-USE-001 | EV-C5 | C-09 StaticUI | ADR-006 | TC-MANUAL-02 | 設計済 |
| NFR-REL-001 | EV-C4 | C-05 BackupService | ADR-001 | TC-E2E-06 | 設計済 |
| NFR-SEC-001 | EV-B9 | C-08 WebServer | ADR-004 | TC-UNIT-13, TC-MANUAL-03 | 設計済 |
| NFR-MAINT-001 | - | 全コンポーネント | ADR-001 | TC-COVERAGE-01 | 設計済 |
| NFR-PORT-001 | EV-B4,EV-B5 | C-08 WebServer | ADR-001, ADR-006 | TC-MANUAL-04 | 設計済 |
| NFR-EXT-001 | - | C-07 ConfigManager | ADR-003 | TC-E2E-07 | 設計済 |

孤立ID: なし（全FR/NFRが設計コンポーネント・テストIDに接続済み）

## Round 1レビュー修正履歴（2026-08-31）
- NFR-EXT-001のテストIDを`TC-E2E-06`から`TC-E2E-07`に修正（Codex役指摘C-004。E2E-06は境界値/バックアップ復旧シナリオでモデル切替とは無関係だった）
- FR-SYS-004に低関連度（非ゼロ件だが実質不一致）ケースのテストID`TC-UNIT-09b`・`TC-E2E-05b`を追加接続（Codex役指摘C-001）
- NFR-SEC-001に自動テスト`TC-UNIT-13`（ネットワーク境界の自動検知）を追加接続（Codex役指摘C-009。従来は手動確認のみだった）
- NFR-PORT-001のEvidence IDを`EV-A2`から`EV-B4,EV-B5`（prebuiltバイナリのOSカバレッジ根拠）に差し替え（Codex役指摘C-019）
