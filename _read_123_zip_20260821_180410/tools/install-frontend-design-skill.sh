#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/.codex/skills/frontend-design"
mkdir -p "$HOME/.codex/skills"
rm -rf "$DEST"
cp -R "$ROOT/.codex/skills/frontend-design" "$DEST"
echo "已安装: $DEST"
