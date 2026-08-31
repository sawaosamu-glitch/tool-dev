#!/usr/bin/env bash
# Dejiina Agent - Install Script (Mac / Linux)
#
# スキル・エージェントを ~/.claude/ にシンボリックリンクで登録します。
# どのフォルダで Claude Code を開いても Dejiina Agent が使えるようになります。
#
# Skills / Agents : シンボリックリンク（git pull で自動反映）
# CLAUDE.md       : 追記（マーカーで二重追記を防止）
#
# Usage:
#   cd ~/dejiina_agent && bash scripts/install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEJIINA_DIR="$(dirname "$SCRIPT_DIR")"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"

ok()   { printf '  \033[32m[OK]\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m[!!]\033[0m %s\n' "$1"; }
info() { printf '  \033[36m[->]\033[0m %s\n' "$1"; }
ng()   { printf '  \033[31m[NG]\033[0m %s\n' "$1"; }

echo ""
echo "=== Dejiina Agent - Install (Mac/Linux) ==="
echo ""
echo "  Source  : $DEJIINA_DIR/.claude"
echo "  Install : $CLAUDE_DIR"
echo ""

if [ ! -d "$DEJIINA_DIR/.claude" ]; then
  ng "$DEJIINA_DIR/.claude が見つかりません。dejiina_agent リポジトリの配置を確認してください。"
  exit 1
fi

# --------------------------------------------------
# Skills（シンボリックリンク）
# --------------------------------------------------
echo "--- Skills ---"
mkdir -p "$CLAUDE_DIR/skills"
SKILL_NEW=0; SKILL_SKIP=0

for d in "$DEJIINA_DIR/.claude/skills/"*/; do
  [ -f "${d}SKILL.md" ] || continue
  name="$(basename "$d")"
  dest="$CLAUDE_DIR/skills/$name"
  if [ -L "$dest" ]; then
    SKILL_SKIP=$((SKILL_SKIP + 1))                       # 既存リンク（dejiina/他エージェント問わず）はそのまま
  elif [ -e "$dest" ]; then
    warn "skip (同名の実フォルダが存在): $name"          # 既存資産は壊さない
    SKILL_SKIP=$((SKILL_SKIP + 1))
  else
    ln -s "${d%/}" "$dest"
    SKILL_NEW=$((SKILL_NEW + 1))
  fi
done

SKILL_TOTAL=$(find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l | tr -d ' ')
ok "Skills 完了 -- new: ${SKILL_NEW} / skip: ${SKILL_SKIP} / total: ${SKILL_TOTAL}"
echo ""

# --------------------------------------------------
# Agents（シンボリックリンク）
# --------------------------------------------------
echo "--- Agents ---"
mkdir -p "$CLAUDE_DIR/agents"
AGENT_NEW=0; AGENT_SKIP=0

for f in "$DEJIINA_DIR/.claude/agents/"*.md; do
  [ -f "$f" ] || continue
  name="$(basename "$f")"
  dest="$CLAUDE_DIR/agents/$name"
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    AGENT_SKIP=$((AGENT_SKIP + 1))
  else
    ln -s "$f" "$dest"
    AGENT_NEW=$((AGENT_NEW + 1))
  fi
done

AGENT_TOTAL=$(find "$CLAUDE_DIR/agents" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
ok "Agents 完了 -- new: ${AGENT_NEW} / skip: ${AGENT_SKIP} / total: ${AGENT_TOTAL}"
echo ""

# --------------------------------------------------
# CLAUDE.md（追記）
# --------------------------------------------------
echo "--- CLAUDE.md ---"
MARKER="# Dejiina Agent"
SRC_CLAUDE="$DEJIINA_DIR/.claude/CLAUDE.md"
DST_CLAUDE="$CLAUDE_DIR/CLAUDE.md"

if [ -f "$SRC_CLAUDE" ]; then
  if [ -f "$DST_CLAUDE" ] && grep -qF "$MARKER" "$DST_CLAUDE"; then
    info "CLAUDE.md: Dejiina セクションは追記済み (skip)"
  elif [ -f "$DST_CLAUDE" ]; then
    cp -p "$DST_CLAUDE" "${DST_CLAUDE}.bak.$(date +%Y%m%d%H%M%S)"   # バックアップ・ファースト
    printf '\n\n' >> "$DST_CLAUDE"
    cat "$SRC_CLAUDE" >> "$DST_CLAUDE"
    ok "CLAUDE.md に Dejiina セクションを追記（元ファイルは .bak に退避）"
  else
    cp "$SRC_CLAUDE" "$DST_CLAUDE"
    ok "CLAUDE.md を作成"
  fi
fi

# --------------------------------------------------
# 完了
# --------------------------------------------------
echo ""
echo "=== インストール完了 ==="
echo ""
echo "  Skills : $SKILL_TOTAL"
echo "  Agents : $AGENT_TOTAL"
echo ""
echo "  -> Claude Code を再起動すると有効になります。"
echo "  -> 更新は  cd ~/dejiina_agent && git pull  だけ（スキル・エージェント自動反映）。"
echo ""
