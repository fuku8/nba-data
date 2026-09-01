#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/arakawahiroaki/nba-data"
cd "$REPO_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] fetch start"
/opt/anaconda3/bin/python3 scripts/fetch-nba-data.py
# ハッスル・トラッキング（API 5呼び出し）は毎日、ショットチャート（46呼び出し）は日曜のみ。
# /types と選手タイプ判定は data/shots/ に依存するため、シーズン中に更新しないとタイプが一切出ない（plan.md §12-4）
/opt/anaconda3/bin/python3 scripts/fetch-hustle-tracking.py || echo "[$(date '+%Y-%m-%d %H:%M:%S')] hustle failed (continue)"
if [[ "$(date +%u)" == "7" ]]; then
  /opt/anaconda3/bin/python3 scripts/fetch-shotcharts.py || echo "[$(date '+%Y-%m-%d %H:%M:%S')] shotcharts failed (continue)"
fi

git add data/
if /usr/bin/git diff --cached --quiet; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] no changes"
  exit 0
fi

/usr/bin/git commit -m "Update NBA data $(date '+%Y-%m-%d')"
/usr/bin/git push origin main
echo "[$(date '+%Y-%m-%d %H:%M:%S')] pushed"
