#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/live-common.sh"
run_dir="$(mktemp -d "$theme_root/.backups/pull-live-XXXXXXXX")"
echo "读取 live 主题 ${live_theme_id}；备份目录：$run_dir"
# Download separately before touching local content.
mkdir "$run_dir/remote"
shopify theme pull --store "$store" --theme "$live_theme_id" \
  --path "$run_dir/remote" --nodelete \
  --only "config/settings_data.json" \
  --only "templates/*.json" --only "templates/**/*.json" \
  --only "sections/*.json"
python3 "$theme_root/scripts/theme-json.py" import "$theme_root" "$run_dir"
