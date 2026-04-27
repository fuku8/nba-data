#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/arakawahiroaki/nba-data"
cd "$REPO_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] fetch start"
/opt/anaconda3/bin/python3 scripts/fetch-nba-data.py

git add data/
if /usr/bin/git diff --cached --quiet; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] no changes"
  exit 0
fi

/usr/bin/git commit -m "Update NBA data $(date '+%Y-%m-%d')"
/usr/bin/git push origin main
echo "[$(date '+%Y-%m-%d %H:%M:%S')] pushed"
