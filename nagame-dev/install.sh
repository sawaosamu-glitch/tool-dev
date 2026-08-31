#!/usr/bin/env bash
# nagame-dev v2.0 インストーラ (Mac / Linux)
# 使い方: bash install.sh
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${HOME}/.claude/skills/nagame-dev"

if [ ! -f "${SRC}/SKILL.md" ]; then
  echo "SKILL.md が見つかりません（このスクリプトと同じフォルダに置いてください）" >&2
  exit 1
fi

mkdir -p "${DEST}"

cp "${SRC}/SKILL.md" "${DEST}/SKILL.md"
[ -f "${SRC}/README.md" ] && cp "${SRC}/README.md" "${DEST}/README.md"

if [ -d "${SRC}/docs" ]; then
  rm -rf "${DEST}/docs"
  cp -r "${SRC}/docs" "${DEST}/docs"
  echo "docs/ ディレクトリ（サブファイル31本）をコピーしました"
fi

TOTAL=$(find "${DEST}" -type f -not -name ".DS_Store" | wc -l | tr -d ' ')
echo "インストール完了: ${DEST} (${TOTAL}ファイル)"
echo "Claude Code を再起動して /nagame-dev が使えます"
