#!/bin/bash
# シーズン繰越: data/ 直下の現シーズンデータを凍結し、次シーズンの取得に備えて空にする。
# 使い方: scripts/rollover.sh 2025-26 2026-27
# 前提: data/<old>/ にスナップショットが保存済みで data/ 直下と差分が無いこと（無ければ中断）。
# 実行後: data/season.txt が <new> になり、フェーズ依存ファイル（PO・shots・boxscores・tracking）が消える。
# RSのCSV（standings/team_*/player_per_game 等）は残す: 次の取得で上書きされるまで旧季の値だが、
# 消すと開幕前のビルドが空ページだらけになる。ヘッダー表記は season.txt に従うので「2026-27 開幕前」と出る。
set -euo pipefail

OLD="${1:?old season (e.g. 2025-26)}"
NEW="${2:?new season (e.g. 2026-27)}"
cd "$(dirname "$0")/.."

[[ "${OLD}" =~ ^[0-9]{4}-[0-9]{2}$ ]] || { echo "old season の形式が不正: ${OLD}"; exit 1; }
[[ "${NEW}" =~ ^[0-9]{4}-[0-9]{2}$ ]] || { echo "new season の形式が不正: ${NEW}"; exit 1; }
[[ "$(cat data/season.txt)" == "${OLD}" ]] || { echo "data/season.txt は ${OLD} ではない: $(cat data/season.txt)"; exit 1; }
[[ -d "data/${OLD}" ]] || { echo "data/${OLD}/ が無い。先にスナップショットを保存する: mkdir data/${OLD} && cp -R data/*.csv data/shots data/boxscores data/${OLD}/"; exit 1; }

# 1. スナップショットと直下の差分ゼロを機械確認（手作業で消して回ると必ずどれかが残る）
fail=0
for f in data/*.csv; do
  b=$(basename "$f")
  cmp -s "$f" "data/$OLD/$b" || { echo "DIFF: $b"; fail=1; }
done
for d in shots boxscores; do
  if [[ -d "data/$d" ]]; then
    diff -rq "data/$d" "data/$OLD/$d" >/dev/null || { echo "DIFF: $d/"; fail=1; }
  fi
done
[[ $fail -eq 0 ]] || { echo "スナップショット data/${OLD}/ と差分あり。スナップショットを更新してから再実行"; exit 1; }
echo "OK: data/${OLD}/ は data/ 直下と一致"

# 2. フェーズ依存ファイルを削除
targets=(data/po_*.csv data/boxscores data/shots data/player_hustle.csv data/player_speed.csv data/player_possessions.csv data/player_shooting.csv data/team_opponent.csv)
echo "削除対象:"; ls -d "${targets[@]}" 2>/dev/null || true
read -r -p "${OLD} -> ${NEW} に繰り越す。続行? [y/N] " ans
[[ "$ans" == "y" ]] || { echo "中断"; exit 1; }
rm -rf "${targets[@]}"

# 3. シーズン更新
printf '%s\n' "${NEW}" > data/season.txt
echo "done: data/season.txt=${NEW} / 次: npm run build で「開幕前」表示を確認し、git commit -m 'data: rollover ${OLD} -> ${NEW}'"
