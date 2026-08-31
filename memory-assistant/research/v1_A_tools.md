# V1 リサーチ：観点A ツール/MCP/OSS

調査日: 2026-08-31
対象プロジェクト: 個人用ナレッジベース＋QAアプリ（完全無料・ローカル完結・日本語対応MVP）

---

### A. ツール/MCP/OSS

| # | 調査項目 | 結果 | ソースURL | 信頼度 |
|---|---|---|---|---|
| A1 | Node.js + SQLite ローカルWebアプリの定番構成 | Node.js製ローカルWebアプリでは `better-sqlite3`（同期API・ネイティブアドオン）が事実上の定番。npmレジストリ上で9,700以上のプロジェクトが利用。HTTP層はExpress（軽量・実績豊富）が最も一般的で、シングルトンのDBコネクションをrequestに紐付けるパターンが推奨される。Node.js 22.5以降には組み込みの `node:sqlite` モジュールもあるが、2026年時点でもStability「Release Candidate」（実験的域を脱したばかり）であり、**FTS5拡張がデフォルトで無効**（コンパイル済みバイナリにFTS5が含まれない）という制約がある。一方 `better-sqlite3` は**FTS5がデフォルトで有効**な状態でビルドされる。全文検索が必須要件の本プロジェクトでは `better-sqlite3` が明確に優位。 | [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3), [WiseLibs/better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3)（7.5k stars, MIT）, [Node.js公式 node:sqlite docs](https://nodejs.org/api/sqlite.html), [HireNodeJS 2026 Guide](https://www.hirenodejs.com/blog/nodejs-builtin-sqlite-node-sqlite-2026) | A（npm/GitHub公式・Node.js公式docs） |
| A2 | better-sqlite3 の詳細（Stars/更新/ライセンス） | GitHub Stars 7.5k、MITライセンス、1,631コミット。「currently supported Node.jsバージョンが必要」と明記（具体的な最小バージョン番号はREADME内に不記載）。ネイティブビルド（node-gyp）が必要な点は「依存を最小限にしたい」という要件と若干トレードオフになるが、prebuilt-binaryが配布されており通常は追加ビルド不要。 | [GitHub WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | A（公式リポジトリ） |
| A3 | SQLite FTS5 で日本語検索：tokenizer比較（unicode61） | FTS5の**デフォルトトークナイザーである unicode61 は日本語を分割できない**（スペース区切りが前提のため、日本語の連続した文字列が1トークンとして扱われるかMATCHが機能しない）。公式ドキュメントにCJK対応の明示的な記述は無い。 | [SQLite公式 fts5.html](https://www.sqlite.org/fts5.html) | A（SQLite公式ドキュメント） |
| A4 | SQLite FTS5 で日本語検索：trigram tokenizer | SQLite 3.34.0（2020-12-01）で追加された組み込み `trigram` トークナイザーは3文字の重複ウィンドウでインデックスするため、形態素解析なしでも日本語の部分文字列検索が可能。追加ライブラリ不要ですぐ使える点が大きな利点。欠点は「2文字未満のクエリにマッチしない」「日本語の助詞などノイズも含めてインデックスするためインデックスサイズが大きくなりがち」。ラテン文字とCJKでunicode61とtrigramをハイブリッドに使い分ける手法も紹介されている。 | [Zenn: Full-text CJK Search with SQLite FTS5](https://zenn.dev/kanseilink/articles/kanseilink-fts5-trigram-cjk-20260507?locale=en), [space-i.com: trigram tokenizerで日本語全文検索](https://www.space-i.com/post-blog/sqlite-fts-trigram-tokenizer%E3%81%A7unigram%EF%BC%86bigram%E6%A4%9C%E7%B4%A2%E3%81%BE%E3%81%A7%E3%82%B5%E3%83%9D%E3%83%BC%E3%83%88-%E6%97%A5%E6%9C%AC%E8%AA%9E%E5%85%A8%E6%96%87%E6%A4%9C%E7%B4%A2/), [SQLite公式 fts5.html §4.3.4](https://www.sqlite.org/fts5.html) | A/B（公式ドキュメント＋技術記事2件で内容一致） |
| A5 | SQLite FTS5 で日本語検索：形態素解析系カスタムtokenizer | 形態素解析ベースのカスタムFTS5拡張も複数存在：`lindera-sqlite`（RustのLinderaトークナイザー、日本語形態素解析対応）、`sqlite-vaporetto`（hotchpotch氏、高速日本語トークナイザーVaporetto採用、20 stars、ネイティブ拡張としてMakefileでビルド、Node.jsからの直接利用方法は非明示）、`fts5_mecab`（thino-rma、MeCab採用、Star数・最終更新日は情報不足）。いずれも精度は高いがネイティブビルド・外部モデルファイル・追加言語（Rust/C++）依存が発生し、「依存最小限」「重量級ライブラリ/ネイティブビルド回避」という要件とは相性が悪い。 | [lindera/lindera-sqlite GitHub](https://github.com/lindera/lindera-sqlite), [hotchpotch/sqlite-vaporetto GitHub](https://github.com/hotchpotch/sqlite-vaporetto)（20 stars）, [thino-rma/fts5_mecab GitHub](https://github.com/thino-rma/fts5_mecab) | B/C（GitHub公式だがStar数が少なく実績が限定的） |
| A6 | Ollama 概要（インストール／料金／ライセンス） | Ollamaは**MITライセンスのオープンソース**で、CLI・APIサーバー・モデルライブラリすべて無料・利用回数制限なし・サブスクなし。インストールはMac/Linuxで `curl -fsSL https://ollama.com/install.sh \| sh`、Windowsで `irm https://ollama.com/install.ps1 \| iex`。2025年半ばにmacOS/Windows向けデスクトップアプリもリリースされ、バックグラウンドサービスとして自動起動。GitHub Stars 179.8k（非常に活発）。モデルは `ollama pull` 初回のみネット接続が必要、以降は完全オフライン動作。 | [ollama/ollama GitHub](https://github.com/ollama/ollama)（179.8k stars, MIT）, [Ollama公式サイト](https://ollama.com) | A（公式リポジトリ・公式サイト） |
| A7 | Ollama のNode.js/HTTPからの呼び出し方 | ローカルで `http://localhost:11434` にREST APIサーバーとして起動し、`/api/generate`・`/api/chat` 等のエンドポイントを提供（OpenAI API互換のリクエスト形式にも対応するため、baseURLを変更するだけで既存のOpenAIクライアントも流用可）。公式Node.js/JavaScriptクライアントとして `ollama-js` が提供されており `npm i ollama` で導入可能。fetch/HTTPリクエストで直接叩くことも容易。 | [ollama/ollama GitHub](https://github.com/ollama/ollama), [Ollama公式 API docs](https://docs.ollama.com/api) | A（公式リポジトリ・公式APIドキュメント） |
| A8 | 類似OSS: Khoj（アーキテクチャ・技術） | 自己ホスト可能な「AI second brain」。ローカル/オンラインLLM双方に対応し、RAG（Retrieval Augmented Generation）でMarkdown/PDF/Notion/Word/org-modeファイルを検索対象にする。ブラウザ・Obsidian・Emacs・デスクトップ・電話・WhatsAppからアクセス可能。GitHub Stars 36.8k、AGPL-3.0ライセンス、5,180コミットと開発が活発。バックエンドの詳細スタック（DB・ベクトル検索実装）はREADMEに明記されておらず、pyproject.toml等の追加調査が必要（Pythonベースであることは示唆されている）。 | [khoj-ai/khoj GitHub](https://github.com/khoj-ai/khoj)（36.8k stars, AGPL-3.0） | A（公式リポジトリ） |
| A9 | 類似OSS: Reor（アーキテクチャ・技術） | 「AIツールはデフォルトでローカルモデルを実行すべき」という思想のデスクトップ・ノートアプリ。Electron + React/TypeScript + Vite構成。ローカルLLM実行に**Ollama**、埋め込み生成に**Transformers.js**、ベクトル検索に**LanceDB**を採用しRAGベースのQ&Aとセマンティック検索・自動リンクを実現。Obsidian風Markdownエディタ内蔵。GitHub Stars 8.6k、AGPL-3.0。**重要な注意点：2026年3月7日付でリポジトリがアーカイブ化（read-only化）されており、現在メンテナンスが停止している**。技術構成の参考にはなるが、依存先として選ぶのはリスクが高い。 | [reorproject/reor GitHub](https://github.com/reorproject/reor)（8.6k stars, AGPL-3.0, 2026-03アーカイブ） | A（公式リポジトリ） |
| A10 | 類似OSS: Logseq（アーキテクチャ参考） | Markdown/org-modeファイルをローカルに保持するプライバシーファーストのナレッジ管理ツール。フロントエンドはClojureScript+Electron、データ層は元々DataScript（インメモリDatalog DB）中心。2025〜2026年にかけて大規模なアーキテクチャ刷新（「DB Version」）を実施し、**SQLite（SQLite-WASM、OPFS上でWALモード）をベースにDataScriptと組み合わせる方式**へ移行中。ローカルファースト設計・SQLite採用という点で本プロジェクトの技術選定と方向性が近く、参考になる。QAアプリではなくノートアプリなためLLM連携の直接的な参考にはならない。 | [logseq/logseq DeepWiki](https://deepwiki.com/logseq/logseq), [logseq/logseq DeepWiki: Database Worker and Synchronization](https://deepwiki.com/logseq/logseq/4.1-database-worker-and-synchronization) | B（非公式解説だが一次ソース（リポジトリ）に基づく詳細な技術解説、DeepWikiはコード解析ベース） |

### 未解決・要V2確認

| # | 項目 | 理由 | V2で何を調べるか |
|---|---|---|---|
| U1 | trigramトークナイザーの日本語検索での実運用インデックスサイズ・検索精度（助詞ノイズの影響） | 情報源が技術記事レベル（B相当）で、定量的なベンチマークが未確認 | 実データ（数百〜数千件のメモ）でunicode61+bigram的運用 vs trigramを実測比較。ノイズ語（助詞等）除去の要否 |
| U2 | Ollamaで日本語QAに向く軽量モデル（メモリ/CPUで実用的に動くもの）の選定 | 今回はOllama自体の概要調査に留まり、具体的モデル（例: qwen2.5, gemma系の日本語性能）は未調査 | 日本語RAG/QAでの実用モデル比較（推論速度・メモリ使用量・日本語品質）とライセンス確認 |
| U3 | Reorがアーカイブされた経緯・後継プロジェクトの有無 | 2026年3月アーカイブという事実のみ確認、理由や代替は未調査 | Issue/Discussionsを確認し、アーカイブ理由とコミュニティの移行先（フォーク等）の有無を調査 |
| U4 | better-sqlite3のNode.jsバージョン対応表・prebuiltバイナリの対応OS/CPUアーキテクチャ | README内に具体的な最小バージョンが非記載 | package.json/リリースノートで対応Node.jsバージョンとprebuild-binaryのカバレッジ（Apple Silicon含む）を確認 |
| U5 | KhojのRAG実装の技術詳細（ベクトルDB種別、埋め込みモデル、完全ローカル動作の可否） | READMEに明記なく、オンラインLLM前提の機能も多く「完全無料・ローカル完結」要件との整合性が未確認 | pyproject.toml/ソースコードを確認し、外部API必須の機能がないか、完全オフラインで動作するかを検証 |

---

## 推奨技術スタック（要約）

**Node.js + Express + better-sqlite3（FTS5デフォルト有効・MIT）で本体を構築し、日本語全文検索はSQLite標準搭載のtrigramトークナイザー（追加依存ゼロ）から着手、精度不足なら形態素解析拡張へ移行。QAはOllama（MIT・完全無料・localhost REST API・公式ollama-jsあり）でローカルLLM連携。ReorはFTS5×Ollama×ローカルRAGの構成参考になるが保守停止中のため直接依存は避ける。**
