# トレーサビリティマトリクス

| 要件ID | 設計コンポーネント | ADR | テストID | 状態 |
|---|---|---|---|---|
| FR-DATA-001 | C-03 UploadHandler | ADR-001 | TC-FR-DATA-001 | 設計済 |
| FR-DATA-002 | C-05 TranscriptionEngine | ADR-002 | TC-FR-DATA-002 | 設計済 |
| FR-DATA-003 | C-06 SummarizationEngine | ADR-003 | TC-FR-DATA-003 | 設計済 |
| FR-DATA-004 | C-01 WebUI | - | TC-FR-DATA-004 | 設計済 |
| FR-DATA-005 | C-07 ResultStore | - | TC-FR-DATA-005 | 設計済 |
| FR-EXT-001 | C-01 WebUI, C-02 JobAPI | ADR-005 | TC-FR-EXT-001 | 設計済 |
| FR-EXT-002 | C-04 VoicyURLAdapter | ADR-005 | TC-FR-EXT-002 | 設計済（技術スパイク完了、実装方式確定。F-007解決） |
| FR-EXT-003 | C-04 VoicyURLAdapter | ADR-005 | TC-FR-EXT-003 | 設計済 |
| FR-SYS-001 | C-08 JobStore, C-01 WebUI | ADR-004 | TC-FR-SYS-001 | 設計済 |
| NFR-FUNC-001 | C-05 TranscriptionEngine | ADR-002 | TC-NFR-FUNC-001 | 設計済 |
| NFR-PERF-001 | C-05 TranscriptionEngine | ADR-002 | TC-NFR-PERF-001 | 設計済 |
| NFR-COMP-001 | 物理ビュー（4章） | ADR-001 | TC-NFR-COMP-001 | 設計済 |
| NFR-USE-001 | C-01 WebUI | - | TC-NFR-USE-001 | 設計済 |
| NFR-REL-001 | C-08 JobStore, CC-01 | - | TC-NFR-REL-001 | 設計済 |
| NFR-SEC-001 | 物理ビュー（4章）, CC-02 | ADR-002, ADR-003 | TC-NFR-SEC-001 | 設計済 |
| NFR-MAINT-001 | 論理ビュー全体（疎結合設計） | - | TC-NFR-MAINT-001 | 設計済 |
| NFR-PORT-001 | 物理ビュー（4章） | - | TC-NFR-PORT-001 | 設計済 |
| NFR-EXT-001 | C-04 VoicyURLAdapter | ADR-005 | TC-NFR-EXT-001 | 設計済 |
