# 要件ID台帳

| ID | タイトル | 優先度 | 根拠ID | 状態 | 設計ID | テストID | リスクID |
|---|---|---|---|---|---|---|---|
| FR-DATA-001 | 音声ファイルをアップロードする | Must | EV-INTAKE-Q3 | Approved | SDD-3.1 | TC-FR-DATA-001 | RISK-004 |
| FR-DATA-002 | 音声を文字起こしする | Must | EV-RESEARCH-A2 [B] | Approved | SDD-3.2 | TC-FR-DATA-002 | RISK-003, RISK-004 |
| FR-DATA-003 | 文字起こし結果を要約する | Must | EV-RESEARCH-A3/C1 [B/C] | Approved | SDD-3.3 | TC-FR-DATA-003 | RISK-003 |
| FR-DATA-004 | 結果を画面に表示する | Must | EV-INTAKE-Q4 | Approved | SDD-3.4 | TC-FR-DATA-004 | - |
| FR-DATA-005 | 結果をローカルファイルに保存する | Must | EV-INTAKE-Q5 | Approved | SDD-3.4 | TC-FR-DATA-005 | - |
| FR-EXT-001 | Voicy URLを入力する | Must | EV-INTAKE-Q1, EV-USER-2026-08-25 | Approved | SDD-3.5 | TC-FR-EXT-001 | RISK-002 |
| FR-EXT-002 | VoicyのURLから音声を取得する | Must | EV-SPIKE-2026-08-25 [A/自己検証] | Approved | SDD-3.5 | TC-FR-EXT-002 | RISK-001, RISK-002, RISK-006 |
| FR-EXT-003 | プレミアム/有料コンテンツの取得を拒否する | Must | EV-SPIKE-2026-08-25 [A/自己検証] | Approved | SDD-3.5 | TC-FR-EXT-003 | RISK-008 |
| FR-SYS-001 | 処理の進捗状況を表示する | Should | EV-INTAKE-Q4 | Approved | SDD-3.6 | TC-FR-SYS-001 | - |
| NFR-FUNC-001 | 文字起こし精度 | Must | EV-INTAKE-Q6 | Approved | SDD-4 | TC-NFR-FUNC-001 | RISK-003 |
| NFR-PERF-001 | 処理速度 | Must | EV-RESEARCH-A2 [B] | Approved | SDD-4 | TC-NFR-PERF-001 | RISK-004 |
| NFR-COMP-001 | 互換性 | Should | - | Approved | SDD-4 | TC-NFR-COMP-001 | - |
| NFR-USE-001 | 使用性 | Should | EV-INTAKE-Q4 | Approved | SDD-4 | TC-NFR-USE-001 | - |
| NFR-REL-001 | 信頼性 | Must | - | Approved | SDD-4 | TC-NFR-REL-001 | - |
| NFR-SEC-001 | セキュリティ（無課金構成） | Must | EV-INTAKE-Q6, EV-RESEARCH-V2確定 | Approved | SDD-4 | TC-NFR-SEC-001 | RISK-005 |
| NFR-MAINT-001 | 保守性 | Should | - | Approved | SDD-4 | TC-NFR-MAINT-001 | - |
| NFR-PORT-001 | 移植性 | Could | - | Approved | SDD-4 | TC-NFR-PORT-001 | - |
| NFR-EXT-001 | 拡張性 | Should | - | Approved | SDD-4 | TC-NFR-EXT-001 | RISK-001 |

## Evidence ID凡例

| Evidence ID | 内容 | 信頼度 |
|---|---|---|
| EV-INTAKE-Q1〜Q7 | Phase 0ヒアリングでの社長回答（本人の一次発言） | A（本人発言） |
| EV-RESEARCH-A2 | faster-whisperの実装実績・ライセンス | B |
| EV-RESEARCH-A3/C1 | Ollama+Qwen3の実装実績 | C/B |
| EV-RESEARCH-B2 | Voicy利用規約の自動取得不可・社長の個人確認による承認 | 社長承認（例外扱い、golden-rules.md 例外条項適用） |
| EV-RESEARCH-V2確定 | 全構成が無料/ローカルであることの技術スタック確定事項 | A（自己検証・公式ドキュメント） |
| 自己検証 | 本セッションでvmw.api.voicy.jpのDNS解決不可を直接確認した記録 | A（一次的な直接検証） |
| EV-SPIKE-2026-08-25 | Phase6技術スパイクで、Firebase匿名認証→vmedia-player-api.voicy.jp→HLS音声DLの一連の流れを実機（Playwright+curl）で確認した記録。research_v2.md「技術スパイク結果」参照 | A（一次的な直接検証） |
| EV-USER-2026-08-25 | 社長の発言「URLを入力することとで対象の音声データを文字データに変換して欲しい」（本セッション） | A（本人発言） |
