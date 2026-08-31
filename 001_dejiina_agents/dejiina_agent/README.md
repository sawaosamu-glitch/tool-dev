# Dejiina Agent

デジタルコンテンツ制作・マーケティング・出版に特化した自律型AIエージェント for Claude Code。

テーマを渡すだけで、リサーチ → 原稿 → 画像生成 → 出版 までを自動化します。

---

## 専門領域

| 領域 | 内容 |
|------|------|
| リサーチ | 出典付きレポート生成、競合・市場調査 |
| 電子書籍・Kindle出版 | 構成設計・原稿25,000字・挿絵・漫画化・DOCX出力 |
| YouTube・動画制作 | 企画・台本・ショート動画・サムネイル |
| SNS・マーケティング | X/note/LP/VSL/ステップメール |
| システム設計 | 要件定義・SDD・API設計 |

---

## 動作環境

- **Windows** 10 / 11（PowerShell）
- **macOS** / **Linux**（bash / zsh）
- [Claude Code](https://claude.ai/code) がインストール済みであること（`claude` コマンドが使えること）
- **Git** がインストール済みであること（ZIP で受け取った場合は不要）

---

## アップグレード履歴

### 2026-05-21 — リサーチ & SDD 強化アップグレード

リサーチ／システム設計（SDD）の資産を拡充し、**APIキー・Ollama・Docker いずれも不要で完走できる無料ワークフロー**を整備しました。

**追加スキル（41 → 47個）**

| スキル | 内容 | 必要なもの |
|--------|------|-----------|
| `/sdd-design` | C4モデル + Arc42 アーキテクチャ設計書生成 | なし（無料） |
| `/sdd-tasks` | Kiro形式タスク分解（依存グラフ・Ganttチャート） | なし（無料） |
| `/sdd-threat` | STRIDE脅威モデリング | なし（無料） |
| `/research-system-free` | 完全無料ディープリサーチパイプライン | なし（無料） |
| `/deep-research-grok` | Grok-4 Live Search 高精度リサーチ | XAI APIキー |
| `/mega-research` | 6-API統合リサーチ | 検索APIキー |

**追加エージェント（18 → 20個）**

| エージェント | 役割 |
|-------------|------|
| `researcher` | 出典付きリサーチアナリスト |
| `architect` | システムアーキテクチャ設計の専門家 |

**既存機能の改善**

- `/sdd-full` が依存する設計・タスク・脅威分析が揃い、7成果物の一括生成が完全動作するように
- SDD系5スキルのモデル指定を `inherit`（セッションのモデルを使用）に変更し、Ollama 依存を解消
- リサーチ／SDDスキル内の「存在しないスキル名」への参照をすべて除去（実行時の「スキルが見つかりません」を解消）
- `/research-system-free` を Ollama 非依存化し、Claude 本体のみで完結する真の無料リサーチに刷新
- `dejiina-planner` がリサーチ既定を無料スキルに切り替え、設計時に品質設計書を参照するよう更新

**参考ドキュメント追加**

- `.claude/references/パイプライン最強設計書_v3.0.md` — 設計の10原則・5次元品質スコアリング

---

## フォルダ構成

```
dejiina_agent/
├── .claude/              Claude Code が読み込む設定フォルダ
│   ├── agents/           エージェント定義（20個）
│   ├── skills/           スキル定義（47個）
│   ├── commands/         スラッシュコマンド
│   ├── hooks/            自動化フック
│   ├── rules/            追加ルール・ガイドライン
│   ├── references/       参考ドキュメント
│   ├── memory/           永続メモリ（.gitignoreで除外）
│   ├── docs/             ドキュメント
│   ├── templates/        テンプレート素材
│   └── CLAUDE.md         エージェント人格・グローバル設定
└── scripts/
    ├── install.ps1        グローバル設定（Windows）
    ├── install.sh         グローバル設定（Mac / Linux）
    ├── setup-project.ps1  プロジェクト単位設定（Windows）
    └── setup-project.sh   プロジェクト単位設定（Mac / Linux）
```

---

# セットアップ — まず「2つの使い方」から選ぶ

Dejiina Agent には導入方法が **2パターン** あります。
**最初にどちらにするかを決めてください。** 選んだら、その章の手順だけを上から順にやればOKです。

| | 🌐 **【パターンA】グローバル設定** | 📁 **【パターンB】プロジェクト単位設定** |
|--|--|--|
| ひとことで | PC の**どのフォルダでも**使える | **指定したフォルダの中だけ**で使える |
| イメージ | アプリを PC に「インストール」する感覚 | フォルダごとに dejiina を「持ち込む」感覚 |
| 設定する回数 | 最初に **1回だけ** | 使いたいフォルダ **ごとに1回** |
| 有効になる範囲 | すべてのフォルダ | リンクしたフォルダのみ |
| こんな人に | ・dejiina をメインのAIエージェントにする<br>・いつでもどこでも気軽に呼びたい<br>・とにかく簡単に始めたい | ・他のAIエージェントも使い分けたい<br>・案件・プロジェクトごとに環境を分けたい<br>・PC全体の設定（`~/.claude/`）は変えたくない |

### 👉 迷ったら？

- **基本は【パターンA】グローバル設定** を選んでください。一番かんたんで、どこでも使えます。
- ただし、**すでに他のエージェント集（taisun-agent など）を導入している人は【パターンB】** を選んでください。設定の衝突を避けられます。

> どちらを選んでも、**ダウンロードした `dejiina_agent` フォルダが「本体」** になります。
> このフォルダを消したり移動したりすると動かなくなります。置き場所を決めてから始めてください。

---

## 🌐【パターンA】グローバル設定 — PC内のどこでも使う

PC のどのフォルダで Claude Code を開いても Dejiina Agent が使えるようになります。

### ステップ A-1：ダウンロード

ホームフォルダの直下に、`dejiina_agent` という名前で本体を配置します。

**方法① Git clone（推奨）**

```bash
# Mac / Linux — ターミナルで実行
git clone https://github.com/dejiinaworks-png/dejiina_agents.git ~/dejiina_agent
```

```powershell
# Windows — PowerShell で実行
git clone https://github.com/dejiinaworks-png/dejiina_agents.git $HOME\dejiina_agent
```

**方法② ZIP でダウンロード**

1. [GitHub ページ](https://github.com/dejiinaworks-png/dejiina_agents) の緑の「Code」ボタン →「Download ZIP」
2. ZIP を展開する
3. フォルダ名を `dejiina_agent` に変更する
4. ホームフォルダの直下に移動する
   - Windows: `C:\Users\<ユーザー名>\dejiina_agent`
   - Mac / Linux: `~/dejiina_agent`

> ⚠️ **重要：** ここで配置した `dejiina_agent` フォルダが本体です。インストール後も**削除・移動しないでください**（中身がリンクで参照されているため、動かすと使えなくなります）。

### ステップ A-2：インストールスクリプトを実行

ダウンロードした本体フォルダの中で、インストールスクリプトを1回実行します。

```powershell
# 🪟 Windows — PowerShell
cd $HOME\dejiina_agent
.\scripts\install.ps1
```

```bash
# 🍎 Mac / Linux — ターミナル
cd ~/dejiina_agent
bash scripts/install.sh
```

これでスキル・エージェントが `~/.claude/`（Claude Code の共通設定フォルダ）に登録されます。

### ステップ A-3：Claude Code を再起動する

開いている Claude Code をいったん終了し、もう一度起動します。

### ステップ A-4：動作を確認する

**どのフォルダでもよい**ので Claude Code を開き、入力欄で `/` を打ってください。
スキル一覧に `/ebook-deji` や `/sdd-full` が出てくれば成功です。
`@dejiina-coordinator` でエージェントが呼べることも確認できます。

### 🌐 パターンA の更新方法

本体フォルダで `git pull` するだけです。

```bash
# Mac / Linux
cd ~/dejiina_agent
git pull
```

```powershell
# Windows
cd $HOME\dejiina_agent
git pull
.\scripts\install.ps1   # ← Windows はエージェント更新のため再実行が必要
```

> Mac / Linux は `git pull` だけでスキル・エージェントとも最新になります。
> Windows はエージェントがコピー方式のため、`git pull` の後に `install.ps1` をもう一度実行してください。

---

## 📁【パターンB】プロジェクト単位設定 — 特定フォルダだけで使う

指定したプロジェクトフォルダの中だけで Dejiina Agent が使えるようになります。
PC 全体の設定（`~/.claude/`）には一切触れないので、他のエージェントと混ざりません。

### ステップ B-1：ダウンロード

ホームフォルダの直下に、`dejiina_agent` という名前で本体を配置します。

**方法① Git clone（推奨）**

```bash
# Mac / Linux — ターミナルで実行
git clone https://github.com/dejiinaworks-png/dejiina_agents.git ~/dejiina_agent
```

```powershell
# Windows — PowerShell で実行
git clone https://github.com/dejiinaworks-png/dejiina_agents.git $HOME\dejiina_agent
```

**方法② ZIP でダウンロード**

1. [GitHub ページ](https://github.com/dejiinaworks-png/dejiina_agents) の緑の「Code」ボタン →「Download ZIP」
2. ZIP を展開する
3. フォルダ名を `dejiina_agent` に変更する
4. ホームフォルダの直下に移動する
   - Windows: `C:\Users\<ユーザー名>\dejiina_agent`
   - Mac / Linux: `~/dejiina_agent`

> ⚠️ **重要：** ここで配置した `dejiina_agent` フォルダが本体です。
> このあと各プロジェクトはこの本体を「参照」して動くので、**削除・移動しないでください**。

### ステップ B-2：使いたいプロジェクトフォルダにリンクする

Dejiina を使いたいプロジェクトフォルダに移動し、セットアップスクリプトを実行します。

```powershell
# 🪟 Windows — PowerShell
cd C:\path\to\your-project     # ← 使いたいプロジェクトフォルダ
~\dejiina_agent\scripts\setup-project.ps1
```

```bash
# 🍎 Mac / Linux — ターミナル
cd ~/path/to/your-project      # ← 使いたいプロジェクトフォルダ
~/dejiina_agent/scripts/setup-project.sh
```

実行すると、そのフォルダに本体への**リンク**が作られます。

```
your-project/
├── .claude/   → ~/dejiina_agent/.claude/（リンク）
├── .gitignore （.claude/ .mcp.json .env が自動追記される）
└── ...
```

### ステップ B-3：そのフォルダで Claude Code を起動する

ステップ B-2 で設定したフォルダを Claude Code で開きます。
（そのフォルダ以外では Dejiina は出てきません。これがパターンB の特徴です）

### ステップ B-4：動作を確認する

入力欄で `/` を打ち、`/ebook-deji` や `/sdd-full` が出てくれば成功です。

### 別のプロジェクトでも使いたくなったら？

そのプロジェクトフォルダで、もう一度 **ステップ B-2** を実行するだけです（使いたいフォルダごとに1回）。

> 💡 **お試しだけしたい場合：** ダウンロードした `dejiina_agent` フォルダ自体を Claude Code で開いても、そのまま全機能が使えます（リンク設定すら不要）。まず触ってみたいときに便利です。

### 📁 パターンB の更新方法

本体フォルダで `git pull` するだけ。リンク済みの全プロジェクトに即反映されます。

```bash
# Mac / Linux
cd ~/dejiina_agent
git pull
```

```powershell
# Windows
cd $HOME\dejiina_agent
git pull
```

> パターンB はリンク方式のため、Windows / Mac とも `git pull` だけで全プロジェクトが最新になります（再設定不要）。

---

## リンクとは？（補足）

パターンA・B とも、ファイルを2か所にコピーするのではなく、
**「本体は `dejiina_agent/` に1つだけ置き、各所からそこを参照させる」** 仕組み（リンク）を使っています。

- だから本体を `git pull` するだけで、すべての環境に更新が反映されます。
- だから本体フォルダを削除・移動すると、参照先を失って動かなくなります。

| OS | スキル | エージェント |
|----|--------|-------------|
| Windows | Junction リンク（`git pull` で自動反映） | コピー（`install.ps1` 再実行で更新） |
| Mac / Linux | シンボリックリンク（`git pull` で自動反映） | シンボリックリンク（`git pull` で自動反映） |

---

# 使い方

セットアップが終わったら、Claude Code の入力欄でエージェント（`@名前`）またはスキル（`/名前`）を呼び出します。

```
# エージェントを呼び出す例
@dejiina-coordinator 電子書籍を作りたい

# スキルを呼び出す例
/ebook-deji 「AIを使った副業の始め方」のテーマで電子書籍と漫画を生成して
/deji-research 競合分析レポートを作って
/lp-full-generation 商品LPを作って
```

### 主なエージェント

| エージェント | 役割 |
|-------------|------|
| `dejiina-coordinator` | 全体指揮・タスク割り振り（迷ったらまずこれ） |
| `dejiina-research` | リサーチ・市場調査 |
| `dejiina-kindle` | Kindle出版・電子書籍制作 |
| `dejiina-video` | YouTube・動画制作 |
| `dejiina-marketing` | SNS・マーケティング |
| `dejiina-planner` | 計画・設計 |

### 主なスキル

| スキル | 役割 |
|--------|------|
| `/ebook-deji` | 電子書籍＋漫画を全自動生成（25,000字 + 挿絵 + DOCX） |
| `/nanobanana-deji` | Gemini APIで画像生成 |
| `/deji-style` | デジイナ式コピーライティング |
| `/lp-full-generation` | LP（ランディングページ）全自動生成 |
| `/mega-research-plus` | 大規模リサーチ |
| `/research-system-free` | 完全無料ディープリサーチ（APIキー・Ollama不要） |
| `/sdd-full` | 要件定義→設計→タスクのSDD成果物を一括生成 |
| `/keyword-mega-extractor` | キーワード抽出・SEO分析 |

### 無料で動く一気通貫ワークフロー

APIキー・Ollama・Docker いずれも不要で、リサーチから設計まで完走できます。

```
/research-system-free   →   /sdd-req100   →   /sdd-full
   無料リサーチ              要件定義          設計・タスク・脅威分析ほか一括生成
```

---

## アンインストール

**📁 パターンB（プロジェクト単位設定）の場合**

プロジェクトフォルダ内の `.claude` リンクを削除するだけです（本体は消えません）。

```bash
rm .claude            # Mac / Linux（リンクのみ削除）
```
```powershell
Remove-Item .claude   # Windows（Junction のみ削除）
```

**🌐 パターンA（グローバル設定）の場合**

`~/.claude/skills/` と `~/.claude/agents/` から Dejiina 由来のリンクを削除し、
`~/.claude/CLAUDE.md` の「# Dejiina Agent」セクションを削除します。
そのうえで本体フォルダ `dejiina_agent/` を削除すれば、完全に元に戻ります。

---

## ライセンス

Copyright © 株式会社デジイナ. All rights reserved.

本ソフトウェアは以下の条件のもとで利用できます。

**許可されること**
- 個人・商用目的での利用
- 内容の改変・カスタマイズ

**禁止されること**
- 本ソフトウェア（スキル・エージェント等）の再配布
- 本ソフトウェアの販売・有償提供（単体・バンドルを問わず）
- 著作権表示の削除・改変
