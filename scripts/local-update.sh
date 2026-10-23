#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/arakawahiroaki/nba-data"
cd "$REPO_DIR"

# 実行証跡: 開始1行・終了1行を logs/run.log に残す。末尾が start のままなら前回が終わっていない
# ロック兼用: その start が LOCK_TTL_MIN 以内なら実行中とみなして退く。超過はクラッシュ残骸として無視（警告のみ）
RUN_LOG="${RUN_LOG:-logs/run.log}"
LOCK_TTL_MIN=120
ALERT_LOG="${ALERT_LOG:-logs/alert.log}"

# 黙って止まった状態の検知（2026-10-24。sumo-data の --check と同じ考え）。launchd 実行は失敗してもログに残るだけなので、
# 終了時に「rc≠0・一部取得の失敗・シーズン中なのに最新試合が STALE_DAYS より古い」を ALERT 行と通知センターに出す
# ponytail: シーズンは月日の固定窓（10/25〜6/10）で判定。オールスター休み（約1週間）より長く止まったら鳴る
STALE_DAYS="${STALE_DAYS:-8}"
WARN=""
alert() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT $1" | tee -a "$ALERT_LOG" || true  # run.log には書かない（末尾行でロック判定しているため）
  /usr/bin/osascript -e "display notification \"$1\" with title \"nba-data 更新\"" 2>/dev/null || true
}
stale_check() {
  local md last ts age
  md=$(date +%m%d)
  if [[ "$md" > "0610" && "$md" < "1025" ]]; then return 0; fi
  last=$( { tail -n +2 data/games.csv; tail -n +2 data/po_games.csv 2>/dev/null || true; } | cut -d, -f2 | sort | tail -n1 ) || last=""  # プレーオフは po_games.csv
  if [[ -z "$last" ]]; then alert "games.csv に試合が無い"; return 0; fi
  ts=$(date -j -f %Y-%m-%d "$last" +%s 2>/dev/null) || { alert "最新試合日が読めない（${last}）"; return 0; }
  age=$(( ( $(date +%s) - ts ) / 86400 ))
  if (( age > STALE_DAYS )); then alert "最新試合が ${age}日前（${last}）。取得が止まっていないか確認"; fi
  return 0
}
if [[ "${1:-}" == "--check" ]]; then stale_check; exit 0; fi

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
on_exit() {
  local rc=$?
  if (( rc != 0 )); then alert "失敗 rc=${rc}。logs/update.log を確認"; fi
  if [[ -n "$WARN" ]]; then alert "一部の取得に失敗（${WARN# }）。前回のデータのまま"; fi
  stale_check
  echo "[$(date "+%Y-%m-%d %H:%M:%S")] end rc=$rc" >> "$RUN_LOG"
}
trap on_exit EXIT

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
  WARN+=" hustle"
  /usr/bin/git checkout -q -- "${TRACKING_OUT[@]}" 2>/dev/null || true
}
# プロフィール（シーズン中に契約した選手の分。未取得の選手だけ1人1呼び出し）。日本語名は手で回す（SCHEDULE.md F2・2026-10-22 決定）
/opt/anaconda3/bin/python3 scripts/fetch-player-profiles.py || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] profiles failed -> revert player_profiles.csv (continue)"
  WARN+=" profiles"
  /usr/bin/git checkout -q -- data/player_profiles.csv 2>/dev/null || true
}
if [[ "$(date +%u)" == "7" ]]; then
  /opt/anaconda3/bin/python3 scripts/fetch-shotcharts.py || {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] shotcharts failed -> revert data/shots (continue)"
    WARN+=" shotcharts"
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
