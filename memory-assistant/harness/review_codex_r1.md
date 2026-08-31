# Codex役レビュー Round 1

## 確認範囲

以下を全文Readで確認した（すべて `/Users/sawaosamu/Desktop/ツール開発/memory-assistant/` 配下）。

- docs/SRS.md（全14章）
- docs/requirements_ledger.md（要件ID台帳、全22行）
- docs/acceptance_criteria.md（受入基準表、全22行）
- docs/SDD.md（全9章）
- docs/adr/ADR-001.md 〜 ADR-006.md（全6件）
- docs/traceability_matrix.md（全22行）
- docs/TEST_PLAN.md（全12章）
- docs/E2E_SCENARIOS.md（全7シナリオ＋RYG判定基準）
- harness/HARNESS.md（全8項目 H1〜H8）
- CONSTRAINTS.md（全6章）
- CLAUDE.md（全13 PART）
- research/research_v1.md, research/research_v2.md（統合結果全文）

参考として `nagame-dev/docs/standards/golden-rules.md`、`nagame-dev/docs/safety/codex-opus-protocol.md` も出力形式・判定基準の確認のために参照した。

**確認しなかった範囲（Escalate対象）**: `docs/risk_register.md`、`docs/exit_criteria.md`、`docs/adoption_stop_criteria.md`、`PROGRESS.md`、`research/v1_A_tools.md`／`v1_B_api.md`／`v1_C_arch.md`／`intake_sheet.md`／`scope_table.md`の原本は、ユーザー指定のレビュー対象リストに含まれていなかったため今回は開いていない（research_v1/v2.mdの要約記載のみで判断した箇所がある）。また、better-sqlite3の実際のnpmパッケージ内容（バンドルSQLiteバージョン、prebuiltバイナリのOS/CPUカバレッジ）やNode.js `node:test`のmock APIの対応バージョンは、ドキュメント記載のみを根拠にしており、npmレジストリ・Node公式変更履歴での実機確認はしていない。該当箇所はC-010・C-018としてEscalate付記した。

## 総合判定: CONDITIONAL GO

Blocker 3件・Must 8件は、いずれもドキュメント修正（設計の明確化・表の訂正・ACC追記）で解消可能であり、アーキテクチャの根本的な作り直しを要するものではない。ただし全Blockerの解消と、Must中でも特にC-001（根拠なき回答拒否の設計・テスト欠落）・C-005（FTS5クエリ構築未定義）の解消なしに実装フェーズへ進むことは推奨しない。

---

## 指摘一覧

### C-001 [優先度: Blocker]
- 該当箇所: `docs/SRS.md` FR-SYS-004本文（158〜177行付近）／`docs/SDD.md` 2章「リクエストフロー例」（58〜72行）／`docs/acceptance_criteria.md` ACC-FR-SYS-004-1／`docs/E2E_SCENARIOS.md` E2E-05
- 内容: FR-SYS-004は根拠なき回答拒否の発動条件を「(a) FTS5検索結果が0件、**または** (b) 検索結果の関連度が著しく低い（1件もタイトル・本文中に検索語の実質一致がない）」の2条件で定義している。しかしSDD 2章のリクエストフロー例は「0件 → mode:'refused'」の分岐しか記述しておらず、(b)の「1件以上あるが実質一致なし」ケースの判定ロジック・閾値・実装箇所が一切設計されていない。ACC-FR-SYS-004-1・E2E-05もいずれも「検索結果0件」のケースのみを検証しており、(b)のケースをテストするACC/TC/E2Eシナリオが存在しない。TEST_PLAN.md 2章で「根拠なき回答の拒否（FR-SYS-004）は本プロジェクトの中核リスクであるため重点的に検証する」と明言している要件の、要件の半分（低関連度・非ゼロ件のケース）が未設計・未テストのまま実装フェーズに進むことになる。
- 修正案: (1) SDDのQAServiceの処理フローに(b)の判定を追加する（例: FTS5のBM25スコアに閾値を設ける、または検索語の文字列が実際にtitle/bodyに部分一致するかをアプリ側で二次チェックする、のいずれかを設計として明記する）。(2) QAService.ask()のインターフェース定義に判定ロジックの入出力を追記する。(3) ACC-FR-SYS-004-2（低関連度ケース）とそれに対応するTC-UNIT/TC-E2Eを新設し、requirements_ledger.md・traceability_matrix.mdにも反映する。

### C-002 [優先度: Blocker]
- 該当箇所: `docs/requirements_ledger.md` NFR-FUNC-001行（18行目）・NFR-PERF-001行（19行目）／`docs/acceptance_criteria.md`（全22行、要件ID列を突合）
- 内容: requirements_ledger.mdはNFR-FUNC-001（Must、検索インデックスの完全性）とNFR-PERF-001（Must、検索応答500ms以内）にそれぞれTC-E2E-01・TC-PERF-01を接続済みとしているが、acceptance_criteria.mdには「要件ID」列に`NFR-FUNC-001`または`NFR-PERF-001`という行が1件も存在しない（22行全てFR-*またはNFR-REL-001/NFR-SEC-001のみ）。NFR-PERF-001の受入基準相当の文言はFR-SYS-001-2行（「メモ1000件時、検索応答が500ms以内(p95)」）に紛れ込んでおり、NFR-FUNC-001に対応する専用文言も存在しない。Must優先度の要件が、レビュー対象の「受入基準表」に正式なACC-*エントリを持たないまま「テストID接続済み」と台帳上は扱われている状態であり、golden-rules.md ルール2（Must要件にはTC-*接続必須＝作れる・試せる・止められるの3条件を満たすこと）の精神に反する。実装者がacceptance_criteria.mdだけを見てテストを書くと、この2つのMust NFRの合否基準が存在しないことに気づけない。
- 修正案: acceptance_criteria.mdに`ACC-NFR-FUNC-001-1`・`ACC-NFR-PERF-001-1`を独立行として新設し、要件IDを正しく`NFR-FUNC-001`／`NFR-PERF-001`とする（現状FR-SYS-001-2に混在している内容をNFR-PERF-001側へ複製または付け替える）。

### C-003 [優先度: Blocker]
- 該当箇所: `docs/SRS.md` FR-SYS-001 Then節（145〜149行、「検索ボックスにキーワード（1文字以上）を入力する」）／`research/research_v1.md` A4行（17行目、「2文字未満は非対応」）／`docs/adr/ADR-002.md`
- 内容: SRS FR-SYS-001は「利用者が検索ボックスにキーワード（**1文字以上**）を入力する」ことをWhen条件として明記し、1文字検索が正常に動作することを前提としている。一方、research_v1.mdのA4（ADR-002の採用根拠）は、採用technology であるFTS5 trigramトークナイザーについて「2文字未満は非対応」と明記している（trigramは3文字単位のインデックスであり、1〜2文字のクエリは原理的にインデックスと一致しないか、実装によってはクエリエラーになる）。SRSが約束する仕様と、ADR-002で選定した技術の制約が正面から矛盾しており、SDD・TEST_PLAN・E2E_SCENARIOSのどこにも1〜2文字検索時のフォールバック（例: LIKE検索併用、エラー文言表示、最小文字数を2〜3文字に変更する等）が設計されていない。このまま実装すると1文字検索でクラッシュするか、常に0件になり「該当するメモが見つかりませんでした」という誤った空状態表示になる（＝FR-SYS-001の受入基準を満たせない）。
- 修正案: 以下いずれかを選択しSRS・SDD双方に反映する。(a) FR-SYS-001の入力制約を「2文字以上」または「3文字以上」に変更し、1〜2文字入力時は保存前バリデーション（8.4節の表）と同様に専用メッセージを表示する。(b) 1〜2文字クエリのみLIKE '%query%'にフォールバックする設計をSDDに追加する。いずれの場合もSRS 8.4「入力バリデーション一覧」・SDD 1章のSearchServiceインターフェース定義・TC-UNIT-06を更新する。

### C-004 [優先度: Must]
- 該当箇所: `docs/requirements_ledger.md` NFR-EXT-001行（26行目）／`docs/traceability_matrix.md` NFR-EXT-001行（26行目）／`docs/E2E_SCENARIOS.md` 対応表（7〜15行）
- 内容: requirements_ledger.mdとtraceability_matrix.mdは共に、NFR-EXT-001（「モデル切替の容易性」＝Ollamaモデル名をconfig.json変更のみで切替可能）のテストIDを`TC-E2E-06`としている。しかしE2E_SCENARIOS.mdの対応表を見ると、E2E-06は「境界値：本文上限境界値とプロセス強制終了からの復旧」であり対応要件は`NFR-REL-001, FR-SYS-005`（データ非損失・バックアップ）である。モデル切替を実際に検証するシナリオは`E2E-07`（Ollamaモデル設定の切替、対応要件`FR-ADM-001`）であり、NFR-EXT-001のテストIDは明らかに`TC-E2E-07`の誤りである。この誤りは`requirements_ledger.md`と`traceability_matrix.md`の両方に同一の形で存在しており、突き合わせでは検出できない（両ドキュメントが同じ誤りをコピーしているため）。traceability_matrix.mdの末尾「孤立ID: なし（全FR/NFRが設計コンポーネント・テストIDに接続済み）」という記述も、接続先が誤っている以上、正確な主張ではない。
- 修正案: `docs/requirements_ledger.md`と`docs/traceability_matrix.md`のNFR-EXT-001行のテストIDを`TC-E2E-06`から`TC-E2E-07`に修正する。あわせて、他の全テストID（TC-UNIT-01〜12, TC-E2E-01〜07, TC-PERF-01, TC-MANUAL-01〜04, TC-COVERAGE-01）についても対応表と実際のシナリオ内容の突合を最終確認する運用（レビュー時のチェックリスト化）を推奨する。

### C-005 [優先度: Must]
- 該当箇所: `docs/SRS.md` FR-SYS-002 Then節（157行「質問文をFTS5検索クエリとして検索を実行し」）／`docs/SDD.md` 1章 インターフェース定義（37行、SearchService.search(query): string）／`docs/E2E_SCENARIOS.md` E2E-02
- 内容: FR-SYS-002は「質問文をFTS5検索クエリとして検索を実行」と記述しているが、自然文の質問（例: E2E-02の「コーヒー豆はどこで買うと言っていたか」）を、trigramトークナイザーのFTS5 MATCH構文にどう変換するかがSDDのどこにも定義されていない。FTS5のMATCH構文は複数のbareword（裸のトークン）を渡すと既定で暗黙のAND結合になる。質問文全体をそのままMATCH文字列として渡した場合、質問文の全trigramが本文中に揃わない限りヒットしない可能性が高く、E2E-02が期待する「言い回しの異なる自然文の質問でも関連メモがヒットする」という挙動を再現できないリスクがある（逆に、質問文をそのまま単純に空白区切りで投げてしまうと、日本語には空白区切りがないため機能しない可能性もある）。SearchService.search(query)のインターフェースは`query: string`としか定義されておらず、質問文の前処理（形態素的な単語分割・OR結合・フレーズクエリ化・ストップワード除去等）をQAService側で行うのか、SearchService内部で行うのかも未定義。
- 修正案: SDD 1章または2章に、質問文→FTS5クエリへの具体的な変換アルゴリズムを明記する（例: 質問文から名詞候補や2文字以上の部分文字列を抽出してOR結合する、あるいはFTS5のtrigramに適した形でクエリ全体をフレーズ的に扱う等）。実装前に小規模なPoC（実データに近い質問文でのヒット率確認）を行い、結果をADR-002またはE2E-02の期待値に反映することを推奨する。確認できない場合は本項目をEscalateとして扱う。

### C-006 [優先度: Must]
- 該当箇所: `docs/SRS.md` 9.4節（created_at/updated_atのISO 8601形式、300行）／`docs/SDD.md` 3章データモデル（92〜96行）／`docs/E2E_SCENARIOS.md` E2E-01・NFR-PERF-001（1000件投入テスト）
- 内容: SRSはcreated_at/updated_atの形式を「YYYY-MM-DDTHH:mm:ssZ相当」と定義しており、ミリ秒精度への言及がない（秒精度と読める）。FR-DATA-002は「登録日時の降順」で一覧表示し、FR-DATA-001は「保存後、メモ一覧の先頭に表示される」ことを保証する。ここで、NFR-PERF-001のテスト（メモ1000件をダミー生成スクリプトで投入、TEST_PLAN.md 9章）のように短時間で大量のメモを連続生成するテストでは、複数メモが同一秒内に作成され`created_at`が同値になるケースが現実的に発生する。SQLiteの`ORDER BY created_at DESC`はタイ（同値）の場合の順序を保証しないため、「一覧先頭に表示される」（FR-DATA-001の受入基準）や「登録日時降順」（FR-DATA-002）のテストが、生成順序に依存して不安定（flaky）になるリスクがある。SDD・TEST_PLANのどちらにもタイブレーク（第2ソートキー）についての言及がない。
- 修正案: (1) created_at/updated_atをミリ秒精度（`YYYY-MM-DDTHH:mm:ss.sssZ`相当）に変更する、または(2) `ORDER BY created_at DESC, id DESC`のように`id`（INTEGER PRIMARY KEY、自動採番で挿入順が保証される）を明示的なタイブレークとしてSDD 1章のNoteStore.findAll()仕様に明記する。後者の方が既存のデータモデル変更が不要で低コスト。TEST_PLAN.mdのダミーデータ生成スクリプト仕様にも、同一秒内生成時の順序保証方法を明記する。

### C-007 [優先度: Must]
- 該当箇所: `docs/SDD.md` 1章「インターフェース定義（抜粋）」表（33〜40行）
- 内容: インターフェース定義表には`NoteStore.create/findAll`、`SearchService.search`、`QAService.ask`、`OllamaAdapter.healthCheck/generate`の関数シグネチャのみが記載されており、Must優先度の要件を担う`BackupService`（FR-SYS-005, Must）、`ExportService`（FR-DATA-006, Should）、`ConfigManager`（FR-ADM-001, Could）については公開関数が一切定義されていない。加えて`NoteStore`自体も`update`・`delete`のシグネチャ（エラー時の挙動、存在しないIDを指定した場合の扱い等）が定義されていない。表の見出しは「抜粋」となっているため一部省略は許容範囲だが、Must要件であるバックアップ機能（データ消失防止の要＝本レビューの重点観点）の公開インターフェースが完全に未定義のまま実装フェーズに進むのはリスクが大きい。
- 修正案: 少なくとも以下を追加する。`BackupService.runBackup(): {path, timestamp}`（失敗時の戻り値/例外仕様含む）、`BackupService.pruneOldBackups(keep=7)`、`NoteStore.update(id, note)`（存在しないID時はValidationError等をthrow）、`NoteStore.delete(id)`（存在しないID時の挙動）。ExportService/ConfigManagerも同様に主要関数の入出力を最低限定義する。

### C-008 [優先度: Must]
- 該当箇所: `docs/SRS.md` FR-SYS-005 例外節（191行）／`docs/acceptance_criteria.md` ACC-FR-SYS-005-1/2／`docs/E2E_SCENARIOS.md` E2E-06
- 内容: FR-SYS-005の例外規定は「バックアップ先ディレクトリへの書き込みに失敗した場合、コンソールにエラーログを出力するが、アプリ本体の動作は継続する」としている。これは可用性の観点では妥当だが、データ消失防止（本プロジェクトの中核要件、TEST_PLAN.md「特に…NFR-REL-001は…重点的に検証する」）の観点では、バックアップが継続的に失敗していても利用者はUI上で一切気づけない設計になっている。ACC-FR-SYS-005-1/2、E2E-06のいずれも「バックアップ失敗時」のケースをテストしておらず、失敗の検知・通知経路が未設計・未テストのまま「バックアップによりデータ消失を防ぐ」という中核の安全性主張が成立している体裁になっている。
- 修正案: (1) バックアップ失敗が一定回数（例: 連続2回）続いた場合はUI上に警告バナーを表示する設計をSRS/SDDに追加する。(2) 最低限、`ACC-FR-SYS-005-3`（バックアップ失敗時にログへ記録されること、および失敗が利用者に可視化される、またはされない場合はその理由を明記）を新設し、対応するTC-UNIT/TC-E2Eを追加する。UI通知を採用しない場合も、その判断を意図的な設計判断としてADRまたはSRS例外節に明記する。

### C-009 [優先度: Must]
- 該当箇所: `docs/requirements_ledger.md` NFR-SEC-001行（23行目、TC-MANUAL-03）／`docs/TEST_PLAN.md` 5章テストピラミッド（Manual層）
- 内容: NFR-SEC-001（Must、「外部ネットワークへの送信は一切発生しない」）の検証手段が`TC-MANUAL-03`（手動パケットキャプチャ確認、リリース前1回のみ）に限定されている。これはgolden-rules.mdルール2の文言上（TC-*が接続されている）は満たしているが、実質的にはコミット毎・実装完了毎の自動テストでは一切検証されない。将来的なコード変更（例: 依存ライブラリ追加、デバッグ用の外部fetch混入等）によって外部送信が発生しても、リリース直前の手動確認まで検知されない。HARNESS.md H8は「宛先はSQLiteとlocalhost:11434のみ、これ以外への追加を禁止する」とコード規約レベルで宣言しているが、それを機械的に担保する自動テストが存在しない。
- 修正案: Node標準機能の範囲内で、グローバルな`fetch`/`http`/`https`モジュールをテスト時にラップ/監視し、`localhost`/`127.0.0.1`以外の宛先へのリクエストが発生した場合にテストが失敗するUnit/Integrationテスト（例: TC-UNIT-13候補）を追加する。ADR-001の最小依存原則（追加パッケージなし）とも矛盾なく、Node標準の`node:http`のモンキーパッチやNode 18+の`fetch`グローバルの一時差し替えで実現可能。TC-MANUAL-03はリリース前の最終確認として残しつつ、CI/コミット単位の自動検知を追加することを推奨する。

### C-010 [優先度: Must / Escalate]
- 該当箇所: `docs/adr/ADR-002.md`（1〜25行）／`research/research_v1.md` A4行／`research/research_v2.md`「技術スタック（確定）」表（27行、better-sqlite3 v13系）
- 内容: ADR-002はFTS5 trigramトークナイザーの採用を「追加依存・ネイティブビルド不要で導入できる」ことを根拠にしているが、これは「better-sqlite3がバンドルするSQLiteのバージョンがtrigramトークナイザーをサポートするバージョン（SQLite 3.34.0以降、かつFTS5ビルドオプションでtrigramが有効化されていること）であること」を暗黙の前提にしている。research_v1/v2.mdはbetter-sqlite3のFTS5対応（デフォルト有効）については確認済みとしているが、trigramトークナイザーそのものが特定バージョンのbetter-sqlite3（v13系）で確実に利用可能かどうかを明示的に確認した記載がない。これは検索機能全体（FR-SYS-001, Must）の土台となる前提であり、もし実装時に利用可能なbetter-sqlite3の同梱SQLiteがtrigram非対応だった場合、`CREATE VIRTUAL TABLE ... USING fts5(tokenize='trigram')`が実行時エラーとなり、検索機能全体が起動不能になる。
- 修正案: 実装開始前に、実際にインストールするbetter-sqlite3のバージョンで`CREATE VIRTUAL TABLE test USING fts5(x, tokenize='trigram')`が成功することを1コマンドで確認するステップをPhase 6の最初のタスクとして明記する（数分で終わる低コストな検証）。本レビューでは一次情報を実機確認していないため、この点はEscalate（要検証）として記録する。

### C-011 [優先度: Must]
- 該当箇所: `docs/TEST_PLAN.md` 9章テスト環境（47〜54行、「OS: macOS（開発機）。Windows/Linuxは手動確認（TC-MANUAL-04）で代替」）／`docs/SRS.md` NFR-PORT-001
- 内容: better-sqlite3のネイティブビルド／prebuiltバイナリの互換性は、TEST_PLAN.md 11章のリスク一覧でも「テスト環境で失敗する」リスクとして明示的に認識されているにもかかわらず、自動テストは開発機のmacOSでしか実行されず、Windows/Linuxはリリース前の手動確認1回のみでカバーされる。better-sqlite3はOS・CPUアーキテクチャ・Node ABIバージョンの組み合わせでネイティブバイナリの挙動が変わりやすく、これは本プロジェクトで最もCI破綻リスクが高い箇所である。手動確認はリリース直前の1回のみのため、実装途中の変更でWindows/Linux固有の問題が混入しても検知が遅れる。
- 修正案: 可能であればCI（GitHub Actions等）でWindows/macOS/Linuxのマトリクスビルドを最低限「`npm install`が成功し起動できること」レベルで実施する。個人開発でCI基盤を持たない場合でも、最低限「Node.jsのバージョンとOSの組み合わせごとのbetter-sqlite3インストール確認手順」をREADMEまたはTEST_PLAN.mdに明記し、手動確認をリリース前1回でなく実装完了直後にも1回追加する（早期検知）。

### C-012 [優先度: Should]
- 該当箇所: `docs/acceptance_criteria.md`（全22行）／`docs/requirements_ledger.md` NFR-COMP-001, NFR-USE-001, NFR-MAINT-001, NFR-PORT-001, NFR-EXT-001行
- 内容: C-002（Blocker）で指摘したMust NFR（FUNC-001, PERF-001）に加え、Should/Could優先度のNFRであるNFR-COMP-001, NFR-USE-001, NFR-MAINT-001, NFR-PORT-001, NFR-EXT-001の5件についても、acceptance_criteria.mdに対応するACC-*行が1件も存在しない。優先度がMustでないため即座のブロッカーではないが、「要件↔設計↔テストの整合性」の観点では、9件のNFRのうち7件（Must 2件＋Should/Could 5件）が受入基準表に反映されていない状態であり、DoD（SRS 14章）の「対応するACC-*・TC-*が全てPASS」というチェックが事実上検証不能になっている。
- 修正案: 実装完了前（Phase 6終了まで）に、残り5件のNFRについてもacceptance_criteria.mdへ簡潔なACC-*行を追加する。手動確認系（TC-MANUAL-*）であっても「何を確認すればPASSとするか」を一文で明記することが望ましい。

### C-013 [優先度: Should]
- 該当箇所: `docs/SRS.md` 10章 非機能要件表（307〜317行）
- 内容: SRS 7章（機能要件）は各FRに「優先度」列（Must/Should/Could）を明記しているが、10章（非機能要件）の表には優先度列自体が存在しない（列は「#, 品質特性, 要件, 測定方法」のみ）。NFRの優先度（Must/Should/Could）はrequirements_ledger.mdにのみ記載されており、SRS自身が優先度の一次情報源になっていない。SRS 14章のDoDは「全Must要件（FR/**NFR**）が実装され」と明記しているにもかかわらず、SRS本体を読んだだけではどのNFRがMustかを判断できず、派生文書であるはずのledgerが実質的な優先度の一次情報源になってしまっている（ドキュメント階層の逆転）。
- 修正案: SRS 10章の非機能要件表に「優先度」列を追加し、requirements_ledger.mdの値と一致させる。

### C-014 [優先度: Should]
- 該当箇所: `docs/SRS.md` FR-DATA-003（121〜126行）／`docs/adr/ADR-005.md`／`harness/HARNESS.md` H1
- 内容: HARNESS.md H1はメモ**削除**（FR-DATA-004）についてのみ、ブラウザ確認ダイアログ＋バックエンド`confirm:true`必須という二重防御を設けている。一方、メモ**編集**（FR-DATA-003）は既存の本文を上書きする操作であり、変更前の内容は（次回の起動時/24時間毎/終了時のバックアップまで）どこにも保持されない点で削除と同程度に「破壊的」だが、確認ダイアログも版管理も一切なく、無防備である。ADR-005は「誤削除対策はバックアップで代替可能」としているが、編集による意図しない上書き（例: 誤って全文を選択して別内容を貼り付けて保存）についてはSRS/HARNESSのどこにも言及がない。
- 修正案: 少なくとも以下のいずれかを検討し、意図的にスコープ外とするなら理由をADRまたはSRS例外節に明記する。(a) 編集時にも簡易な確認（変更差分の表示、または「元に戻す」用の直前バージョンをメモリ上に一時保持）を追加する。(b) 現状のまま据え置く場合、「編集の誤上書きはバックアップ（最大24時間前まで）でのみ復旧可能」という制約をSRS 11章の復元手順に明記し、利用者に周知する。

### C-015 [優先度: Should]
- 該当箇所: `docs/SRS.md` 9.1データモデル（274〜284行、`tags TEXT -- カンマ区切り文字列`）／`docs/SRS.md` FR-DATA-005／`docs/SDD.md` 1章 NoteStore.findAll(opts)
- 内容: タグはカンマ区切りの単一TEXTカラムとして保存される設計だが、FR-DATA-005（タグ絞込）を実現する具体的なSQLクエリ方式がSDDに定義されていない。単純な`tags LIKE '%tag%'`実装を選んだ場合、部分文字列の誤マッチ（例: タグ「AI」で絞り込むと、タグ「AIチーム」を含むメモも意図せずヒットする）が発生しうる。カンマ区切り文字列に対する正確な完全一致検索には、値の前後をカンマで挟んでLIKE比較する、あるいはタグを正規化した別テーブルに分離するなどの設計判断が必要だが、いずれもSDDに記載がない。
- 修正案: SDD 1章のNoteStore.findAll(opts)の実装方針として、タグ一致判定のSQLを明記する（例: `WHERE (',' || tags || ',') LIKE '%,' || ? || ',%'`のようにカンマ境界を明示した完全一致方式を採用する）。TC-UNIT-05のテストケースにも「部分一致するが異なるタグでは絞り込まれないこと」を検証項目として追加する。

### C-016 [優先度: Should]
- 該当箇所: `docs/requirements_ledger.md` FR-DATA-001行（TC-UNIT-01, TC-E2E-01）／`docs/acceptance_criteria.md` ACC-FR-DATA-001-1/2/3
- 内容: acceptance_criteria.mdはFR-DATA-001に対して3件のACC（正常保存/本文空エラー/50001文字境界エラー）を定義しているが、requirements_ledger.mdはFR-DATA-001に対して単体テストIDを`TC-UNIT-01`の1件しか割り当てていない。同様のパターンがFR-DATA-002（ACC 2件、TC-UNIT-02の1件）、FR-SYS-001（ACC 3件、TC-UNIT-06の1件）、FR-SYS-003（ACC 2件、TC-UNIT-08の1件）、FR-SYS-005（ACC 2件、TC-UNIT-11の1件）にも見られる。1つのTC-UNIT-IDが複数のACCシナリオ（正常系・異常系・境界値）を内部的にどこまでカバーする想定かが不明瞭で、実装時に「TC-UNIT-01を1つのit()ブロックとして書いて境界値ケースを取りこぼす」リスクがある。
- 修正案: 1つのTC-UNIT-IDが複数のit()/test()ケースの集合（テストファイル内の複数アサーション）を表すのか、それとも1テストケース＝1IDの厳密対応を意図しているのかをTEST_PLAN.mdに明記する。可能であればACC-*の粒度に合わせてTC-UNIT-IDをTC-UNIT-01a/01b/01cのように分割することを推奨する。

### C-017 [優先度: Should]
- 該当箇所: `docs/SRS.md` 9.4データ整合性制約（298行、`CHECK(length(body) >= 1)`）
- 内容: 本文の下限（1文字以上）はDBのCHECK制約で保証されているが、上限（50,000文字以内）はDBレベルの制約として定義されておらず、アプリ層（WebServer/NoteStore）のバリデーションのみに依存している。CONSTRAINTS.md C-DATA-001は「NoteStore経由のみで書き込む」ことを規約化しているため実務上のリスクは限定的だが、下限と上限で保護レベルに非対称性があり、多層防御（defense in depth）の観点では上限もDB制約に含めるのが望ましい。
- 修正案: `CHECK(length(body) >= 1 AND length(body) <= 50000)`のように上限もDB制約に含める。

### C-018 [優先度: Should / Escalate]
- 該当箇所: `docs/TEST_PLAN.md` 9章（52行、「Node.js標準の`node:test` + `assert`」）／`docs/TEST_PLAN.md` 11章リスク一覧（67行、「OllamaAdapterをモック化した単体テストで代替」）／`docs/SRS.md` NFR-COMP-001（Node.js 18 LTS以上）
- 内容: OllamaAdapterのモック化を含む単体テストをNode標準の`node:test`だけで実装する方針だが、`node:test`のモック機能（`t.mock`, `MockTimers`等）が、SRSが互換性を保証する最低バージョンであるNode.js 18系の全パッチで安定して利用可能かどうかがドキュメント上確認できていない（Node標準テストランナーのモック機能はバージョンによって導入時期・安定度が異なる）。もし実装に必要なモックAPIがNode 18の早期パッチで利用不可/experimentalだった場合、NFR-COMP-001（Node 18 LTS以上で動作）とテスト実装自体の前提が食い違うリスクがある。
- 修正案: 実装開始前に、CIまたは開発機で使用予定のNode.jsバージョン（18/20/22系）で`node:test`のモックAPIが安定版として利用可能かを確認する。本レビューでは正確なバージョン対応表を実機・一次情報で確認していないため、Escalate（要検証）として記録する。

### C-019 [優先度: Should]
- 該当箇所: `docs/requirements_ledger.md` 末尾「Evidence ID対応表」（28〜32行）／同ファイルNFR-PORT-001行（25行、EV-A2使用）
- 内容: requirements_ledger.mdのNFR-PORT-001行はEvidence IDとして`EV-A2`を使用しているが、末尾のEvidence ID対応表には`EV-A4`と`EV-A6`のみが個別定義されており、`EV-A2`はどの凡例グループにも明示的に含まれていない（`EV-B1/B3/B4/B5/B7/B9`のBシリーズ表記と紛らわしい）。実際にはresearch_v1.md記載の「A2: better-sqlite3詳細」を指すと推測できるが、凡例表からは機械的に判別できない。またA2の内容（better-sqlite3のライセンス・スター数・メンテ状況）は、NFR-PORT-001（3OSでのセットアップ容易性）の直接的な根拠としてはやや弱く、B4/B5（prebuiltバイナリのOSカバレッジ）の方が本来の論拠に近い。
- 修正案: Evidence ID対応表にA1〜A10の全項目を明記するか、少なくとも実際に使用されているIDのみを漏れなく列挙する。NFR-PORT-001の根拠IDをEV-A2からEV-B4/B5に差し替えることも検討する。

### C-020 [優先度: Later]
- 該当箇所: `docs/SDD.md` 4章物理ビュー／`docs/SRS.md` 6章外部インターフェース／`docs/adr/ADR-003.md`
- 内容: config.jsonのデフォルト値（ポート3000、ollamaModel既定`qwen3:4b`、backupIntervalHours=24）は、SRS 6章・ADR-003・SRS 4章にそれぞれ分散して記載されており、SDDに一覧化された「config.jsonスキーマ・デフォルト値表」が存在しない。実装可能性を著しく損なうものではないが、実装者が複数文書を横断して値を拾い集める必要があり、将来デフォルト値を変更する際の更新漏れリスクがある。
- 修正案: SDD 4章または3章に、config.jsonのフィールド名・型・デフォルト値・出典要件IDを一覧化した表を追加する（低優先度、Phase 6着手前で構わない）。

### C-021 [優先度: Later]
- 該当箇所: `docs/SDD.md` 2章「並行処理・非同期の扱い」（78行、「backup()APIはオンラインバックアップ…書き込みをブロックしない」）
- 内容: better-sqlite3は完全同期API（ネイティブバインディングを同期呼び出し）であるため、`backup()`呼び出し自体はNode.jsのイベントループを（DBサイズに応じた時間）占有する。SDDの記述「書き込みをブロックしない」はSQLite内部のオンラインバックアップAPIが他の書き込みトランザクションをロックしないという意味では正しいが、Node.jsのシングルスレッド上でJS実行がブロックされないという意味だと誤読されるおそれがある。個人・単一ユーザー規模では実害は小さいと考えられるが、記述の精度に改善余地がある。
- 修正案: 「SQLiteレベルでは他の書き込みをブロックしないが、better-sqlite3は同期APIのためNode.jsのイベントループはbackup()実行中は占有される（個人利用規模では許容範囲）」のように、2つの異なるレベルのブロッキングを区別して記述する。

### C-022 [優先度: Later]
- 該当箇所: `CONSTRAINTS.md` C-SEC-006（30行、「npm audit」必須）／`docs/TEST_PLAN.md`／`CLAUDE.md` PART F
- 内容: `npm audit`の実行がCONSTRAINTS.md・CLAUDE.mdのチェックリストに記載されているが、TEST_PLAN.mdのテストスケジュール（10章）やEntry/Exit Criteria（6〜7章）のどこにも「いつ・誰が・どの頻度でnpm auditを実行するか」が明記されていない。チェックリスト上の項目として存在するのみで、実行タイミングがプロセスに組み込まれていない。
- 修正案: TEST_PLAN.mdのExit Criteria（7章）またはリリース前チェック（CLAUDE.md PART G）に「npm auditで高/重大脆弱性0件」を明示的な合否条件として追加する。

---

## サマリー

Blocker 3件、Must 8件、Should 8件、Later 3件（うちC-010・C-018はEscalate＝要実機検証を付記）。

Blockerは(1)根拠なき回答拒否の低関連度ケースが未設計・未テスト、(2)Must優先度NFR2件（FUNC-001/PERF-001）の受入基準が受入基準表に不在、(3)FTS5 trigramの技術的制約（2文字未満非対応）とSRSの「1文字以上検索可」が矛盾、の3点。いずれもドキュメント修正で解消可能だが、実装着手前の解消を強く推奨する。要件ID台帳とトレーサビリティマトリクスの突合では、NFR-EXT-001のテストID誤り（TC-E2E-06→正しくはTC-E2E-07）を実際に発見した。
