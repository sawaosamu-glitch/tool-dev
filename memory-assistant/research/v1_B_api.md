### B. API/ライブラリ/利用規約

| # | 調査項目 | 結果 | ソースURL | 信頼度 |
|---|---|---|---|---|
| B1 | SQLiteのライセンス | **パブリックドメイン**。「SQLiteの全コード・全ドキュメントは著作者によりパブリックドメインに提供されている」「誰でも商用・非商用を問わず、あらゆる目的でSQLiteのソースコード・コンパイル済みバイナリを複製・改変・公開・使用・コンパイル・販売・配布できる」と明記。料金・ライセンス費用は一切不要（Hwaci社が発行する任意の「Warranty of Title」証明書の購入は完全にオプションで、通常の個人利用では不要）。 | https://sqlite.org/copyright.html | A |
| B2 | FTS5拡張の可用性・ライセンス | FTS5はSQLite 3.9.0（2015年10月リリース）以降、標準ディストリビューションに同梱される全文検索用virtual table拡張。SQLite本体と同じくパブリックドメイン扱い。ソースツリー版configureではデフォルト無効（`--enable-fts5`または`SQLITE_ENABLE_FTS5`定義が必要）だが、amalgamation版configureではデフォルト有効。追加ライセンス・利用制限の記載なし。 | https://sqlite.org/fts5.html | A |
| B3 | better-sqlite3のライセンス | **MITライセンス**（2017年、Joshua Wise氏が著作権者）。著作権表示・許諾表示の保持のみが条件の、商用・個人利用ともに無制限で利用・改変・再配布・販売可能な寛容ライセンス。無保証（AS IS）。 | https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/LICENSE （npm registry package.jsonでも license: "MIT" を確認） | A |
| B4 | better-sqlite3のメンテナンス状況 | 現行最新版は v13.0.3（2026-08-05リリース）。GitHubリポジトリは2026-08-10に直近push、star数7,462、openなissue 71件、archived: false（開発継続中）。npm上のdescriptionは "The fastest and simplest library for SQLite in Node.js."。活発にメンテナンスされている定番ライブラリと判断できる。 | https://github.com/WiseLibs/better-sqlite3 （`gh api repos/WiseLibs/better-sqlite3` で取得） / https://registry.npmjs.org/better-sqlite3/latest | A |
| B5 | better-sqlite3のFTS5対応 | 対応済み。メンテナ本人がissueで「better-sqlite3はデフォルトでSQLiteを`SQLITE_ENABLE_FTS5`付きでコンパイルしている」と明言。追加設定不要で、通常のSQL（`CREATE VIRTUAL TABLE ... USING fts5(...)`）でFTS5全文検索が利用可能。 | https://github.com/WiseLibs/better-sqlite3/issues/1253（メンテナコメント） | A |
| B6 | Ollamaのローカルインストール・ライセンス | Ollama本体（サーバー/CLI）はGitHub公式リポジトリで **MITライセンス**（SPDX: MIT）として配布。オープンソース。無料で利用可能。star数約18万、直近pushも活発でメンテナンス状況良好。 | https://github.com/ollama/ollama （LICENSEファイル、`gh api repos/ollama/ollama`で確認） | A |
| B7 | OllamaローカルAPIの仕様 | ローカルREST APIはデフォルトで `http://localhost:11434` で待受。主要エンドポイント: `POST /api/generate`（テキスト生成）、`POST /api/chat`（チャット応答生成）、`POST /api/embed`（埋め込みベクトル生成）、`GET /api/tags`（ローカルモデル一覧）、`POST /api/pull`（モデルダウンロード、要ネット接続）ほか。公式ドキュメントに認証（APIキー等）に関する記載はなく、デフォルトではローカルホスト内で認証なしに利用可能。レート制限に関する記載も公式ドキュメント内に存在しない（ローカル実行のためAPI課金・レート制限の概念自体が適用されない）。 | https://github.com/ollama/ollama/blob/main/docs/api.md | A |
| B8 | Ollamaの完全ローカル動作・無料性・プライバシー | 公式プライバシーポリシーで「Ollamaはあなたのローカルデバイス上で動作します。ローカルで処理されるプロンプト・応答・モデルとのやり取り等のコンテンツを、当社は収集・保存・送信・アクセスすることはありません」と明記。ローカル実行時は通信不要（モデルのダウンロード時のみインターネット接続が必要、`ollama pull`後は完全オフラインで推論可能）。収集されるのはアプリバージョン等の限定的な利用メタデータのみで、プロンプト/応答内容は含まれない。課金体系はローカル実行に関しては存在せず、モデルのダウンロード・実行自体は無料。（Ollama Cloud等の別サービスは有料プランがあるが、本プロジェクトが要求するローカル完結用途では対象外） | https://ollama.com/privacy | A |
| B9 | 選定ライブラリ群の「完全ローカル・ネットワーク不要」可否 | SQLite/FTS5：純粋にファイルベースのローカルDBエンジンであり、ネットワーク通信機構自体を持たない（そもそもクライアント/サーバー型RDBMSではない）ため、公式仕様上も完全オフライン動作が保証される。better-sqlite3：SQLiteのNode.jsバインディングであり、ネイティブモジュールとしてローカルプロセス内で動作、通信要件の記載は公式ドキュメントに一切なし＝ネットワーク不要。Ollama：上記B8の通り、モデルダウンロード後の推論・埋め込み生成はネットワーク不要で完全ローカル動作することが公式プライバシーポリシーで明言されている。以上より、3ライブラリとも「完全ローカル動作・ネットワーク不要」という要件を満たすことを一次情報で確認できた。 | https://sqlite.org/copyright.html / https://github.com/WiseLibs/better-sqlite3 / https://ollama.com/privacy | A |
| B10 | 個人メモをローカルSQLiteファイルに保存する上での法的・規約的懸念 | 懸念なし。SQLiteファイルはローカルディスク上に生成される単なる自己完結型ファイル（サーバーやクラウドサービスへの送信を伴わない）であり、SQLite自体がパブリックドメインで「いかなる目的でも自由に使用可」と明記されているため、外部の利用規約・ライセンス条項の対象にならない。データの保存先・利用方法はすべてユーザー自身のローカル環境に閉じており、第三者の個人情報保護方針・ToS・APIの利用規約に抵触する要素は存在しない（本プロジェクトは個人が自分自身のメモのみを扱う想定であり、第三者データの収集・第三者サービスへの送信は行わないため）。 | https://sqlite.org/copyright.html （B1と同一根拠） | A |

### 外部API検証チェックリスト（該当があれば）

※ 本プロジェクトの構成要素（SQLite / better-sqlite3 / Ollama）はいずれも「外部API」ではなくローカル完結のOSSライブラリ・ローカルサーバーであるため、厳密な意味での「外部API」は存在しない。参考としてOllamaのローカルAPIについて整理する。

| 確認項目 | 結果 |
|---|---|
| 利用可能性 | Ollamaはローカルにインストールしたサーバープロセスが提供するREST API（`http://localhost:11434`）であり、外部ネットワーク上のサービスではない。常時利用可能（PC起動中かつOllamaプロセス稼働中のみ）。 |
| 認証方式 | なし。公式APIドキュメントに認証機構（APIキー等）の記載はなく、ローカルホスト内での利用が前提。 |
| レート制限 | 公式ドキュメントに記載なし。ローカル実行のため外部サービス側の制限は存在しない（実質的な制約はローカルPCのCPU/GPU/メモリ性能のみ）。 |
| 料金体系 | 無料。ローカルでのモデル実行・API呼び出しに課金は一切発生しない（公式サイト・プライバシーポリシーで有料なのは別サービスのOllama Cloud/有料プランのみと確認）。 |
| 利用規約 | Ollama本体はMITライセンスのOSS。個人のローカル利用において追加のToS同意や利用制限は課されない。モデルファイル自体（Llama、Gemma等）は各モデル提供元が定める別ライセンス（Llama Community License等）に従う点は要注意だが、これはOllama自体の規約ではなく個別モデルの配布ライセンスの問題であり、V2で利用予定モデルを確定した際に個別確認が望ましい。 |

### 未解決・要V2確認

| # | 項目 | 理由 | V2で何を調べるか |
|---|---|---|---|
| B-V2-1 | 実際に使用する個々のOllamaモデル（例: llama3, gemma2, mistral等）のモデルライセンス | Ollama本体（実行エンジン）はMITだが、配布されるモデルの重み自体は各モデル提供元が個別にライセンスを設定しており（Meta Llama Community License、Google Gemma利用規約など）、商用利用制限や再配布制限が含まれる場合がある。個人の非商用利用であれば通常問題ないが、一次ソースでの確認が望ましい。 | 採用予定モデル名を確定した上で、当該モデルの公式カード/ライセンスページ（Ollama Library内の該当モデルページ、またはHugging Face上のライセンス表記）を確認する。 |
| B-V2-2 | better-sqlite3のプリビルドバイナリが存在しない環境でのネイティブビルド要件 | 今回の調査ではnpmページ本体（403で直接取得不可）の詳細な「Requirements」セクションを完全には確認できなかった。ユーザーの実行環境（OS/Node.jsバージョン/CPUアーキテクチャ）次第では、node-gyp等によるローカルコンパイルが必要になり、その際はPythonやC++ビルドツール（Xcode Command Line Tools等）を別途要求される可能性がある。 | 実際の開発マシン（OS・Node.jsバージョン）でのインストール実地検証、および公式READMEの"Installation"セクションの精読。 |
| B-V2-3 | FTS5の日本語（形態素）検索精度 | FTS5標準のトークナイザ（unicode61等）は日本語のようなスペース区切りのない言語の分かち書きに弱く、実用上の検索精度が課題になりうる（ライセンス・規約上の論点ではないため本リサーチのB観点対象外だが、機能面での確認が必要）。 | trigramトークナイザの活用可否、または外部形態素解析器（MeCab等）との組み合わせ要否をV2の技術リサーチ（観点A/機能要件寄り）で確認する。 |

