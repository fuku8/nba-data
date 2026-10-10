#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/arakawahiroaki/nba-data"
cd "$REPO_DIR"

# 実行証跡: 開始1行・終了1行を logs/run.log に残す。末尾が start のままなら前回が終わっていない
# ロック兼用: その start が LOCK_TTL_MIN 以内なら実行中とみなして退く。超過はクラッシュ残骸として無視（警告のみ）
RUN_LOG=logs/run.log
LOCK_TTL_MIN=120
last="$(tail -n1 "$RUN_LOG" 2>/dev/null || true)"
if [[ "$last" == *' start' ]]; then
  age=$(( ( $(date +%s) - $(date -j -f '%Y-%m-%d %H:%M:%S' "${last:1:19}" +%s) ) / 60 ))
  if (( age < LOCK_TTL_MIN )); then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] another run started ${age}min ago -> skip"
    exit 0
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN previous run has no end line (${age}min ago, stale -> ignore)" | tee -a "$RUN_LOG"
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S')] start" >> "$RUN_LOG"
trap 'rc=$?; echo "[$(date "+%Y-%m-%d %H:%M:%S")] end rc=$rc" >> "$RUN_LOG"' EXIT

echo "[$(date '+%Y-%m-%d %H:%M:%S')] fetch start"
# 失敗時はコアCSV・boxscoresも戻して中断（tracking/shotsと同じ「部分更新をコミットしない」不変を対称化。run-1指摘）
/opt/anaconda3/bin/python3 scripts/fetch-nba-data.py || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] core fetch failed -> revert data/ and clean boxscores, abort"
  /usr/bin/git checkout -q -- data/ 2>/dev/null || true
  /usr/bin/git clean -fdq data/boxscores
  exit 1
}
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

# 所有者別仕分け: このジョブが書くのは data/ だけ。それ以外の未コミット差分は人の編集として触らず報告のみ
/usr/bin/git status --porcelain | grep -v '^.. data/' | sed "s/^/[$(date '+%Y-%m-%d %H:%M:%S')] NOTE untouched (not ours): /" || true

git add data/
if /usr/bin/git diff --cached --quiet; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] no changes"
  exit 0
fi

/usr/bin/git commit -m "Update NBA data $(date '+%Y-%m-%d')"
/usr/bin/git push origin main
echo "[$(date '+%Y-%m-%d %H:%M:%S')] pushed"
