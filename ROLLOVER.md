# シーズン繰越（ロールオーバー）手順

作成日: 2026-09-02
対象: `scripts/rollover.sh`, `data/season.txt`, `data/<season>/`, `scripts/local-update.sh`（launchd 日次取得）
背景と設計判断は `plan.md` §12（Phase 0・§12-11）。ここは手順だけを書く。

---

## いつやるか

**新シーズン開幕の前日〜当日。** 早くやるほど損をする。

- NBA API は開幕前の新シーズンを問い合わせると選手スタッツ・試合が 0 行で返る（順位表だけ 30 チーム 0-0）。2026-09-02 に `LeagueDashPlayerStats` / `LeagueGameFinder` の 2026-27 で実測。
- 繰越の翌日 16:00 の日次取得で RS の CSV がヘッダーのみに上書きされ、開幕まで RS 各ページ（トップ・選手一覧・リーダーズ・チーム）は「<新季> Regular Season」見出しのまま空表になる。「開幕前」表示があるのは PO ページ（`/playoffs`・`/*/po`）だけ。
- 現季の選手 URL `/players/<id>` は静的パラメータが空になり 404 になる（`/players/<id>/<旧季>` は残る）。
- 一方、繰越を遅らせて失うものは無い。日次取得は旧季を取り続けるだけで、確定済みの値は AGE（誕生日）と hustle の丸め以外は動かない。

開幕日は毎年変わるので NBA 公式の schedule で確認する（例年 10 月下旬）。

## 前提

- `data/<旧季>/` にスナップショットがある（2025-26 は `dd37490` で保存済み）。無ければ `mkdir data/<旧季> && cp -R data/*.csv data/shots data/boxscores data/<旧季>/`
- launchd の日次取得（`com.nba-data.update`・毎日 16:00）がロードされている: `launchctl list | grep nba-data`
- 作業ツリーがクリーン（`git status`）

## 手順

`rollover.sh` は「スナップショットと `data/` 直下の差分ゼロ」を機械確認し、差分があれば中断する。手作業で消して回らず、必ずスクリプトを通す。

```bash
cd ~/nba-data

# 1. スナップショットとの差分を見る
for f in data/*.csv; do cmp -s "$f" "data/2025-26/$(basename "$f")" || echo "DIFF: $f"; done
diff -rq data/shots data/2025-26/shots && diff -rq data/boxscores data/2025-26/boxscores

# 2. 差分があれば揃える。日次取得で AGE と hustle の小数桁が動くだけなので、
#    確定時点の値（スナップショット）を正とし、直下をスナップショットで戻す。
#    16:00 の日次取得が走ると再びずれるので、2〜5 は同じ日の 16:00 前に終える。
cp data/2025-26/*.csv data/

# 3. 繰越（確認プロンプトで y）
scripts/rollover.sh 2025-26 2026-27

# 4. ビルド検証（静的エクスポート。落ちる場合は下の「既知の落とし穴」）
npm run build

# 5. コミット・push（データ更新コミットとは分ける）
git add data/ && git commit -m "data: rollover 2025-26 -> 2026-27"
git push origin main   # SSH が使えない環境では HTTPS URL を明示
```

### 4 のビルドで確認すること

| 確認項目 | 期待 |
|---|---|
| `out/playoffs.html` | 「プレーオフ開幕前」 |
| `out/index.html` | 見出しが「2026-27 Regular Season」 |
| `out/players/203999/2025-26.html` | 2025-26 の RS が上・PO が下で出る |
| `out/games/0042500101.html` | 過去季（2025-26 PO）のボックススコアが残っている |
| `out/og/players/2025-26/` | 過去季の選手 OG 画像がこのディレクトリに出る |

### 翌日以降に確認すること

- `logs/update.log`（16:00 実行後）: RS 取得が 0 選手で「✓」になっていること。PO 取得（`po_player_per_game`）が毎日「✗」で落ちる場合は例外の扱いを見直す（`plan.md` §12 Phase 0 の未確認事項）。hustle は失敗時に自動で HEAD に戻るので「hustle failed -> revert」は正常。
- Cloudflare Pages のビルドが通っていること（GitHub `main` の push 後）。
- 開幕後の初回取得で `player_per_game.csv` に行が入り、`MIN_GP` の下限（`plan.md` §12「序盤のGP下限」）で League Percentile が出ること。

## 既知の落とし穴（静的エクスポート）

繰越後の状態を模擬してビルドしたとき、以下の 2 件でビルドが落ちた（2026-09-02・`38ea369` で修正済み）。同種の変更を入れるときに再発しやすいので残す。

1. **動的ルートの `generateStaticParams` が空になると `output: "export"` はビルド失敗にする**（「missing generateStaticParams()」。`next/dist/build/index.js` の `prerenderedRoutes.length > 0` 判定）。`/games/[gameId]` は boxscore（PO のみ取得）から params を作るため RS 期間中に空になった。→ 現季＋過去季から探す（`findBoxScore` / `boxScoreGameIds`）。新しい `[param]` ルートを足すときは「現季のデータが無い期間に params が空にならないか」を必ず考える。`/teams/[teamId]` は固定 30 チーム、`/players/[...slug]` は過去季も列挙するので安全。
2. **Route Handler は拡張子なしのファイルで書き出される**ため、`og/players/<id>` と `og/players/<id>/<season>` が同名衝突して EISDIR。→ 過去季は `/og/players/<season>/<id>` に逆順化。`page.tsx` は `.html` が付くので衝突しない。

模擬ビルドのやり方（本体を汚さない）:

```bash
S=/tmp/nba-sim && mkdir -p $S && rsync -a --exclude .next --exclude .git --exclude out ~/nba-data/ $S/
# node_modules はシンボリックリンク不可（Turbopack が "points out of the filesystem root" で拒否）。rsync で実体コピーする
cd $S && scripts/rollover.sh 2025-26 2026-27 && npm run build
# 翌日の取得後を模擬するなら RS CSV をヘッダーのみにしてもう一度 build
for f in player_per_game player_totals player_advanced games team_per_game team_advanced; do head -1 data/$f.csv > data/$f.tmp && mv data/$f.tmp data/$f.csv; done
npm run build
```

## 戻し方

繰越コミットを `git revert` すれば `season.txt` と削除したファイルが戻る。日次取得が既に新季で走ってしまった後なら、その「Update NBA data」コミットも一緒に revert する。
