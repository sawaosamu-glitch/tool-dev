# HARNESS.md — voicy-transcribe 安全ハーネス仕様

## H1: DRY_RUN
- 環境変数: `DRY_RUN`
- デフォルト: `true`（VoicyURLAdapterのみ対象。faster-whisper/Ollamaは外部有料APIではないためDRY_RUN対象外＝常に実実行）
- 切り替え: `export DRY_RUN=false`（実際にVoicyへアクセスする場合）

## H2: 承認ゲート
- 形式: UIでの確認表示（「個人利用の範囲でVoicyから音声データを取得します」）に加え、**`confirmed: bool` をAPIリクエストの必須パラメータとしてサーバー側で強制する**（UI表示だけに頼らない。Round1レビューF-002対応：UIを経由しないAPI直呼び出しでのバイパスを防止）
- 対象: FR-EXT-002（Voicy URL取得）実行前
- 未承認時の動作: `POST /api/jobs`が`confirmed=false`または未指定の場合、VoicyURLAdapterはネットワークアクセス前に`PermissionError`を送出し、JobAPIはHTTP 400を返す（取得処理を一切実行しない）

## H3: 冪等性
- 対象: 文字起こし・保存処理（C-05, C-07）
- 実装: 同一音声ファイルへの再実行は同一の文字起こし結果を生成する（NFR-REL-001, CC-05）。保存ファイル名にタイムスタンプを含めるため上書きは発生しない（別ファイルとして保存される）

## H4: キルスイッチ
- トリガー: Ctrl+C（サーバープロセスへのSIGINT）
- 動作: JobStoreはインメモリでプロセス終了と同時に消滅するため、「状態をinterruptedにする」ことに意味はない（Round1レビューF-014で指摘）。実際の安全設計は以下とする:
  1. SIGINT受信時、実行中のバックグラウンドタスク（`asyncio.to_thread`）に中断を通知する
  2. `work/{job_id}/`配下の未完成な中間ファイル（部分書き込みの音声・テキスト）を削除してからプロセスを終了する
  3. `output/`への書き込みは完了後の一括書き込みのみとし、中断時に破損した出力ファイルが残らないようにする

## H5: 監査ログ
- ファイル: `logs/app.log`
- 形式: `[timestamp] [level] [component] [action] [result]`
- ローテーション: 10MBで1世代ローテーション
- 記録対象: ジョブの状態遷移、VoicyURLAdapterの呼び出し（成功/失敗）、Ollama接続エラー
- 記録しない: 音声内容の本文・全文テキスト・要約本文（CC-02、個人情報保護のため）

## 決定論的センサーとの関係
Phase4テスト計画（`docs/TEST_PLAN.md`）のS1〜S6が本ハーネスの実効性を検証する。特にS6（bandit）はH2/H5の実装漏れ（承認ゲートのバイパス、ログの機密情報混入）を検出する目的で使用する。
