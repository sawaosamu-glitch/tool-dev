# テストケース定義（TC-*）

Round1レビュー指摘F-006（TC-*がID参照のみで実体がない）への対応。各テストケースの入力・期待値を具体化する。

## Unit テスト

| TC ID | 対象 | 入力 | 期待値 |
|---|---|---|---|
| TC-FR-DATA-001 | UploadHandler.save | `tests/fixtures/standard_5min.mp3`（UploadFile） | `work/{job_id}/standard_5min.mp3`が作成され、Pathが返る |
| TC-FR-DATA-001-invalid-ext | UploadHandler.save | `invalid.mov` | `ValidationError`送出、メッセージに「対応していない形式です」を含む |
| TC-FR-DATA-001-oversize | UploadHandler.save | 500MB+1バイトのファイル | `ValidationError`送出、メッセージに「500MB」を含む |
| TC-FR-DATA-002 | TranscriptionEngine.transcribe | `tests/fixtures/short_3sec.wav` | 非空の文字列が返る |
| TC-FR-DATA-002-corrupt | TranscriptionEngine.transcribe | 破損ファイル（先頭数バイトのみのmp3） | `TranscriptionError`送出 |
| TC-FR-DATA-003 | SummarizationEngine.summarize | 200文字程度の日本語テキスト | 非空の要約文字列が返る（Ollamaがモック/実機いずれかで応答） |
| TC-FR-DATA-003-short | SummarizationEngine.summarize | 30文字のテキスト | `None`が返る（50文字未満はスキップ） |
| TC-FR-DATA-003-ollama-down | SummarizationEngine.summarize | Ollama未起動状態で200文字のテキスト | `None`が返る（例外を送出しない） |
| TC-FR-DATA-003-chunk | SummarizationEngine.summarize | 3000字超のテキスト | チャンク分割され、最終的に1つの要約文字列（またはNone）が返る。分割呼び出し回数がログで確認できる |
| TC-FR-DATA-005 | ResultStore.save | job（transcript_text, summary_text入り） | `output/{timestamp}_{filename}.md`が作成され、Pathが返る |
| TC-FR-EXT-001 | JobAPI（URLバリデーション） | `https://example.com/xxx` | 400エラー、「Voicyのエピソードページのみ対応しています」 |
| TC-FR-EXT-002-unconfirmed | VoicyURLAdapter.fetch | 有効URL, `confirmed=False` | `PermissionError`送出、ネットワーク呼び出しが発生しない（モックで検証） |
| TC-FR-EXT-002-fail | VoicyURLAdapter.fetch | 有効URL, `confirmed=True`（メタデータAPI呼び出し失敗をモック） | `None`が返る |
| TC-FR-EXT-002-success | VoicyURLAdapter.fetch | 有効URL, `confirmed=True`（Firebase認証・メタデータAPI・HLS取得を全てモックで成功させる） | `work/{job_id}/audio.aac`のPathが返る |
| TC-FR-EXT-003 | VoicyURLAdapter.fetch | 有効URL, `confirmed=True`（メタデータAPIのレスポンスを`is_premium=true`にモック） | `PremiumContentError`送出、HLS取得は一切行われない（モックでネットワーク呼び出し0回を確認） |
| TC-FR-SYS-001-lock | JobStore | 同時に2件のジョブ作成リクエスト（モック並行実行） | 1件は作成され、もう1件は429相当のエラーになる |

## Integration テスト

| TC ID | シナリオ | 期待値 |
|---|---|---|
| TC-INT-001 | `POST /api/jobs`（ファイル添付）→ `GET /api/jobs/{id}`をポーリング | 最終的に`status=="done"`、`transcript_text`が非空 |
| TC-INT-002 | `POST /api/jobs`（URL, confirmed=true, 取得失敗をモック） | `status=="fallback_required"`になる |
| TC-INT-003 | `POST /api/jobs`（URL, confirmed=false） | HTTP 400、ジョブが作成されない |
| TC-INT-004 | 処理中（`transcribing`状態）に`GET /api/jobs/{id}`を呼ぶ | 1秒以内に応答が返る（イベントループがブロックされていないことの確認、F-001対応） |

## Acceptance / Security / Smoke

`docs/acceptance_criteria.md`のACC-*を参照。Smokeテストは `GET /health` が200を返すことのみを確認する（`TC-SMOKE-001`）。
