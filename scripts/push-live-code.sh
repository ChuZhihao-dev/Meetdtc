#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/live-common.sh"
run_dir="$(mktemp -d "$theme_root/.backups/push-live-XXXXXXXX")"
echo "目标 live 主题：${live_theme_id}；核对记录：$run_dir"
mkdir "$run_dir/before" "$run_dir/after"
shopify theme pull --store "$store" --theme "$live_theme_id" \
  --path "$run_dir/before" --nodelete --only "**/*.json"
python3 "$theme_root/scripts/theme-json.py" validate "$run_dir/before"
shopify theme push --store "$store" --theme "$live_theme_id" \
  --path "$theme_root" --allow-live --nodelete --ignore "**/*.json"
echo "代码已上传，正在核对线上 JSON……"
shopify theme pull --store "$store" --theme "$live_theme_id" \
  --path "$run_dir/after" --nodelete --only "**/*.json"
python3 "$theme_root/scripts/theme-json.py" verify "$run_dir/before" "$run_dir/after"
