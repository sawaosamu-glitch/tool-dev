#!/usr/bin/env bash
# Dejiina Agent - Project Setup (Mac / Linux)
#
# 任意のプロジェクトフォルダに .claude/ シンボリックリンクを作成します。
# 実行後、そのフォルダで Claude Code を開くと Dejiina の全スキル・エージェントが使えます。
#
# Usage:
#   cd ~/your/project && ~/dejiina_agent/scripts/setup-project.sh
#   または
#   ~/dejiina_agent/scripts/setup-project.sh ~/your/project
#
# グローバルには何もインストールしません。指定フォルダ内だけで Dejiina が有効になります。

set -euo pipefail

# --------------------------------------------------
# パス解決
# --------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEJIINA_DIR="$(dirname "$SCRIPT_DIR")"

if [ "${1:-}" != "" ]; then
  mkdir -p "$1"
  PROJECT_DIR="$(cd "$1" && pwd)"
else
  PROJECT_DIR="$(pwd)"
fi

ok()   { printf '  \033[32m[OK]\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m[!!]\033[0m %s\n' "$1"; }
info() { printf '  \033[36m[->]\033[0m %s\n' "$1"; }
ng()   { printf '  \033[31m[NG]\033[0m %s\n' "$1"; }

echo ""
echo "=== Dejiina Agent - Project Setup (Mac/Linux) ==="
echo ""
echo "  Dejiina : $DEJIINA_DIR"
echo "  Project : $PROJECT_DIR"
echo ""

if [ ! -d "$DEJIINA_DIR/.claude" ]; then
  ng "$DEJIINA_DIR/.claude が見つかりません。dejiina_agent リポジトリの配置を確認してください。"
  exit 1
fi

# --------------------------------------------------
# git init
# --------------------------------------------------
if [ ! -d "$PROJECT_DIR/.git" ]; then
  git -C "$PROJECT_DIR" init -q
  ok "Git initialized"
else
  ok "Git already initialized"
fi

# --------------------------------------------------
# .claude/ シンボリックリンク
# --------------------------------------------------
CLAUDE_LINK="$PROJECT_DIR/.claude"

if [ -L "$CLAUDE_LINK" ]; then
  CURRENT_TARGET="$(readlink "$CLAUDE_LINK")"
  if [ "$CURRENT_TARGET" = "$DEJIINA_DIR/.claude" ]; then
    ok ".claude/ は既にリンク済み (skip)"
  else
    warn ".claude/ が別の場所を指しています: $CURRENT_TARGET"
    rm "$CLAUDE_LINK"
    ln -s "$DEJIINA_DIR/.claude" "$CLAUDE_LINK"
    ok ".claude/ を張り替えました -> $DEJIINA_DIR/.claude"
  fi
elif [ -e "$CLAUDE_LINK" ]; then
  # 実フォルダが存在する場合はバックアップしてから置き換える（バックアップ・ファースト原則）
  BACKUP="${CLAUDE_LINK}.backup.$(date +%Y%m%d%H%M%S)"
  mv "$CLAUDE_LINK" "$BACKUP"
  warn "既存の .claude/ を退避しました: $BACKUP"
  ln -s "$DEJIINA_DIR/.claude" "$CLAUDE_LINK"
  ok ".claude/ -> $DEJIINA_DIR/.claude"
else
  ln -s "$DEJIINA_DIR/.claude" "$CLAUDE_LINK"
  ok ".claude/ -> $DEJIINA_DIR/.claude"
fi

# --------------------------------------------------
# .gitignore
# --------------------------------------------------
GITIGNORE="$PROJECT_DIR/.gitignore"
for entry in ".claude/" ".mcp.json" ".env"; do
  if [ ! -f "$GITIGNORE" ] || ! grep -qxF "$entry" "$GITIGNORE"; then
    echo "$entry" >> "$GITIGNORE"
  fi
done
ok ".gitignore 更新 (.claude/ .mcp.json .env)"

# --------------------------------------------------
# 完了
# --------------------------------------------------
SKILL_COUNT=$(find "$DEJIINA_DIR/.claude/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
AGENT_COUNT=$(find "$DEJIINA_DIR/.claude/agents" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "  .claude/   -> $DEJIINA_DIR/.claude/"
echo "  Skills     : $SKILL_COUNT"
echo "  Agents     : $AGENT_COUNT"
echo ""
echo "  -> このフォルダで Claude Code を開くと Dejiina Agent が使えます。"
echo "  -> 更新は  cd ~/dejiina_agent && git pull  だけで全プロジェクトに即反映。"
echo ""
