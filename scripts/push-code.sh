#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || ! "$2" =~ ^[0-9]+$ ]]; then
  echo "用法：bash scripts/push-code.sh 店铺.myshopify.com 主题ID" >&2
  exit 1
fi

theme_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# Keep merchant settings and page composition on the remote theme.
# Do not forward arbitrary flags that could override these exclusions.
shopify theme push \
  --path "$theme_root" \
  --store "$1" \
  --theme "$2" \
  --nodelete \
  --ignore "**/*.json"
