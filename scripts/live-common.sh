#!/usr/bin/env bash
set -euo pipefail
theme_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
store="meetdtc-40icat5f.myshopify.com"
command -v shopify >/dev/null
command -v python3 >/dev/null
# Resolve the live ID once, so all steps target the same theme.
live_theme_id="$(shopify theme list --store "$store" --json | python3 -c '
import json, sys
themes = [t for t in json.load(sys.stdin) if t.get("role") == "live"]
if len(themes) != 1 or not str(themes[0]["id"]).isdigit():
    sys.exit("无法唯一确认已发布主题，已停止。")
print(themes[0]["id"])
')"
mkdir -p "$theme_root/.backups"
