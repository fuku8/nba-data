#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/arakawahiroaki/nba-data"
cd "$REPO_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] fetch start"
/opt/anaconda3/bin/python3 scripts/fetch-nba-data.py
# ハッスル・トラッキング（API 5呼び出し）は毎日、ショットチャート（46呼び出し）は日曜のみ。
# /types と選手タイプ判定は data/shots/ に依存するため、シーズン中に更新しないとタイプが一切出ない（plan.md §12-4）
# 失敗時は部分更新（一部CSVだけ新しい・PARTIAL保存のshots）をコミットしないよう、そのスクリプトの出力だけ HEAD に戻して続行する
TRACKING_OUT=(data/player_hustle.csv data/po_player_hustle.csv data/player_speed.csv data/po_player_speed.csv data/player_possessions.csv data/po_player_possessions.csv)
/opt/anaconda3/bin/python3 scripts/fetch-hustle-tracking.py || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] hustle failed -> revert tracking csv (continue)"
  /usr/bin/git checkout -q -- "${TRACKING_OUT[@]}" 2>/dev/null || true
}
if [[ "$(date +%u)" == "7" ]]; then
  /opt/anaconda3/bin/python3 scripts/fetch-shotcharts.py || {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] shotcharts failed -> revert data/shots (continue)"
    /usr/bin/git checkout -q -- data/shots 2>/dev/null || true
    /usr/bin/git clean -fdq data/shots
  }
fi

git add data/
if /usr/bin/git diff --cached --quiet; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] no changes"
  exit 0
fi

/usr/bin/git commit -m "Update NBA data $(date '+%Y-%m-%d')"
/usr/bin/git push origin main
echo "[$(date '+%Y-%m-%d %H:%M:%S')] pushed"
