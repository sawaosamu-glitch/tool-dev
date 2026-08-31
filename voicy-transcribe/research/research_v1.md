# リサーチ V1

## 調査日: 2026-08-25
## 対象プロジェクト: voicy-transcribe（VoicyのURLを入力すると文字起こし＋要約するアプリ）

---

### A. ツール/MCP/OSS

| # | 調査項目 | 結果 | ソースURL | 信頼度 |
|---|---|---|---|---|
| A1 | Voicy音声の取得ツール | yt-dlpに `VoicyIE` / `VoicyChannelIE` 抽出器が存在する。対応URL: `https://voicy.jp/channel/{channel_id}/{voice_id}`。**ただし `_WORKING = False` と明記されており、現在は動作しない状態としてマークされている**（Voicy側のAPI変更等でyt-dlp側が無効化した可能性が高い） | https://raw.githubusercontent.com/yt-dlp/yt-dlp/master/yt_dlp/extractor/voicy.py | A（一次ソース＝ライブラリ本体のコード） |
| A2 | ローカル文字起こし（日本語） | faster-whisper（CTranslate2実装、openai/whisperの約4倍速）がローカル日本語文字起こしの定番。large-v3モデルで精度が安定するとの実装報告あり | https://zenn.dev/okamyuji/articles/local-meeting-transcriber-with-whisper | B |
| A3 | ローカル要約（LLM） | OllamaでローカルにLLMを実行可能。2026年時点で日本語汎用モデルはQwen3が推奨（Apache 2.0ライセンス、商用利用可） | https://weel.co.jp/media/tech/ollama/ | C（要B以上での裏取りが必要） |

### B. API/ライブラリ/利用規約

| # | 調査項目 | 結果 | ソースURL | 信頼度 |
|---|---|---|---|---|
| B1 | Voicy公式API | 開発者向けの公式APIは検索上確認できず。個人開発者による非公式の実装例（VoicyのURLをOpenAI APIで要約するZenn記事）は存在するが、公式提供のAPIではない | https://zenn.dev/heku/articles/1a1c1c7b59e8ef | C |
| B2 | Voicy利用規約の内容確認 | **未確認**。`voicy.jp/terms-of-service` はJS（SPA）でレンダリングされるページで、静的取得（WebFetch/curl）ではテキスト本文を取得できなかった。archive.org等の代替手段でも取得不可だった | https://voicy.jp/terms-of-service | 取得不可のためA評価不能 |
| B3 | Voicy公式のダウンロード機能 | Voicy公式アプリに「自動音声ダウンロード（オフライン再生用）」機能はあるが、これはアプリ内キャッシュ用であり、生の音声ファイルとして外部に取り出せる機能ではない（少なくとも2022年時点のヘルプセンターでは明言なし） | https://voicy.zendesk.com/hc/ja/articles/5853936126105 | B（公式ヘルプセンター） |
| B4 | 非公式のダウンロード方法 | 個人ブログで「録音・ダウンロードする方法」という記事が存在（画面録音等の非公式手段と推測） | https://blurayappletv.exblog.jp/29255104/ | D（内容未検証、規約適合性の裏付けなし） |

### C. アーキテクチャ/コミュニティ

| # | 調査項目 | 結果 | ソースURL | 信頼度 |
|---|---|---|---|---|
| C1 | ローカル完結型の文字起こしパイプライン構成例 | 「faster-whisper（文字起こし）＋Ollama（ローカルLLMで議事録要約）」という組み合わせが実例として存在。プライバシー・コスト・オフライン利用の面で有利と紹介されている | https://zenn.dev/okamyuji/articles/local-meeting-transcriber-with-whisper | B |
| C2 | Voicy×AI要約の先行実装 | 「VoicyやYouTubeのURLを入力してOpenAI APIで要約するアプリ」を個人が作成した記事が存在。音声取得の実装方法（yt-dlp等）まで含めて参考にできる可能性がある | https://zenn.dev/heku/articles/1a1c1c7b59e8ef | C |

---

### 未解決・要V2確認

| # | 項目 | 理由 | V2で何を調べるか |
|---|---|---|---|
| 1 | **[Blocker] Voicy利用規約が音声ダウンロード・自動取得を許可しているか** | 公式規約ページがSPAで自動取得できず、信頼度A（一次ソース）での確認が未完了 | 社長による目視確認、または規約全文の手動貼付。黄金ルール#3・#4によりYellow/Red判定の対象 |
| 2 | yt-dlpのVoicy抽出器が `_WORKING = False` である具体的な理由（サイト側の仕様変更か、意図的なブロックか） | コード上のフラグのみで経緯が不明 | GitHubのIssue/PRで無効化理由を確認 |
| 3 | Voicyの音声配信方式（HLS/MP3等）とURLから音声を特定する技術的な代替手段の有無 | yt-dlpが機能しない場合の代替実装が必要 | ブラウザのネットワークタブ相当の技術調査、または断念して手動アップロード方式に切替 |
| 4 | faster-whisperの実行に必要なマシンスペック（CPU/GPU/メモリ）と処理時間の目安 | 「無料で完結」の実現可能性判断に必要 | 公式README・ベンチマークの確認 |
| 5 | Ollama＋Qwen3の日本語要約品質が実用に足るか | 個人ブログ情報のみで未検証 | 実機検証 or 公式ベンチマーク確認 |

---

## 暫定所見（V1時点）

1. **技術的リスク**: Voicy音声の自動取得における定番OSS（yt-dlp）の対応抽出器が **現在無効化されている**。これは「今すぐ動く」実装が存在しない可能性を示す一次情報（コードそのもの）。
2. **規約リスク**: Voicyの利用規約を自動取得できず、無断ダウンロード・自動化ツールの可否を**信頼度Aで確認できていない**。黄金ルール#3（dry-runがない破壊的操作はRed）および情報源信頼度ルール（外部API/規約はAのみで判断）に照らすと、**現時点でURLからの自動音声取得機能を実装するのはRed〜Yellow相当のリスク**。
3. 文字起こし（faster-whisper）・要約（Ollama）自体はローカル完結・無料で実現できる技術的な裏付けが複数ある（B以上）。**この部分は問題なく進められる。**

→ 音声「取得」部分のリスクが高いため、Phase 2（SRS）に進む前に社長へ確認・方針決定を仰ぐ。
