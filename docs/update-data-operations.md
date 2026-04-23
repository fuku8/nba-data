# NBA Data Update Operations

作成日: 2026-04-23
対象: `.github/workflows/update-data.yml`, `scripts/fetch-nba-data.py`, `data/`

---

## 概要

`update-data` GitHub Actions は、NBA.com 公式 API を `nba_api` 経由で取得し、`data/` 配下の CSV / JSON を更新する運用ジョブである。

2026-04-23 に、以下の2点を変更した。

1. GitHub Actions の定期実行を日本時間 14:00 と 21:00 の1日2回に変更した。
2. NBA API の一部エンドポイントが GitHub runner から古い結果を返す場合に備えて、プレーオフ試合結果の補完処理と API リトライを追加した。

---

## 定期実行時刻

GitHub Actions の cron は UTC で評価される。

現在の `update-data` schedule は以下。

| 日本時間 | UTC | cron | 用途 |
|---|---:|---|---|
| 14:00 JST | 05:00 UTC | `0 5 * * *` | 当日昼時点の更新確認 |
| 21:00 JST | 12:00 UTC | `0 12 * * *` | 夜時点の更新確認 |

この2回実行は、14:00枠を早期更新、21:00枠を取りこぼし回収・最終確認ラインとして扱う。

NBA API は基本的にリアルタイム更新される前提のため、試合があった日に14:00枠（GitHub Actions の混雑により実実行が遅れる場合を含む）で `Commit and push` が `skipped` になった場合は、21:00枠で回収できるか確認する。21:00枠でも `skipped` の場合は、stale response、取得対象外、スクリプト不具合などの可能性が高く、要調査とする。

対象ファイル:

- `.github/workflows/update-data.yml`

変更コミット:

- `1d2614d Run data update twice daily JST`

---

## 2026-04-23 の障害調査メモ

### 現象

GitHub Actions の `update-data` を手動実行しても、データ更新コミットが作成されなかった。

確認した run:

| Run | Event | 結果 | `Commit and push` | 備考 |
|---:|---|---|---|---|
| #37 | `workflow_dispatch` | success | skipped | `Check for changes` が差分なし判定 |
| #38 | `workflow_dispatch` | success | skipped | 同上 |
| #39 | `schedule` | success | skipped | 同上 |

いずれも `Fetch data from NBA.com` は success だったが、`git add data/` 後の `git diff --cached --quiet` で差分なしと判定され、commit/push step がスキップされた。

### ローカル検証結果

同じ `scripts/fetch-nba-data.py` をローカルから実行すると、NBA API から新しいプレーオフ試合が取得できた。

既存の `data/po_games.csv` は 14 試合だったが、ローカル実行では 16 試合になった。

追加された試合:

| GAME_ID | 日付 | スコア |
|---|---|---|
| `0042500102` | 2026-04-22 | DET 98 - 83 ORL |
| `0042500142` | 2026-04-22 | OKC 120 - 107 PHX |

生成された新規 boxscore:

- `data/boxscores/0042500102.json`
- `data/boxscores/0042500142.json`

更新されたシリーズ状況:

| シリーズ | 変更前 | 変更後 |
|---|---:|---:|
| DET vs ORL | 0-1 | 1-1 |
| OKC vs PHX | 1-0 | 2-0 |

### 推定原因

GitHub Actions runner から `LeagueGameFinder` を叩いた場合、ローカルから取得できる最新結果より古いレスポンスが返っていた可能性が高い。

`ScoreboardV2` では 2026-04-22 の2試合が Final として確認できたため、NBA API 全体が未更新だったわけではなく、`LeagueGameFinder` 側またはアクセス元/CDN単位での反映遅延・stale response が起きていたと判断した。

---

## スクリプト変更内容

対象ファイル:

- `scripts/fetch-nba-data.py`

変更コミット:

- `33c94a9 Fix NBA data update fallback`

### 1. API リトライ

NBA API 呼び出しを `get_data_frames()` helper 経由に変更した。

目的:

- `stats.nba.com` の一時的な timeout を吸収する。
- 短時間のネットワーク失敗で即座にデータ更新全体が失敗しないようにする。
- 最終的に失敗した場合は、その失敗を明示的に検出できるようにする。

デフォルトは `API_RETRIES = 3`。

### 2. `ScoreboardV2` によるプレーオフ試合補完

従来はプレーオフ試合一覧を `LeagueGameFinder` のみから作成していた。

変更後は、`LeagueGameFinder` の結果に加えて、直近5日分の `ScoreboardV2` を確認し、Final になっているプレーオフ試合を補完する。

補完対象の条件:

- `GAME_ID` が `004` で始まること
- `GAME_STATUS_ID == 3`、つまり Final であること
- home / visitor の line score が取得できること

補完後は `GAME_ID` で重複排除し、`GAME_DATE`, `GAME_ID` で並び替えて `data/po_games.csv` に保存する。

### 3. 部分失敗時の exit code 修正

従来は各取得処理が失敗しても、最後に `sys.exit(1)` しないため、GitHub Actions 上は成功扱いになる可能性があった。

変更後は、結果サマリーで成功件数が全件に満たない場合に `sys.exit(1)` する。

これにより、以下のような状態を success として見逃さない。

- 選手スタッツだけ timeout した。
- boxscore の一部だけ取得できなかった。
- `LeagueGameFinder` は成功したが、他の必要データ取得が失敗した。

---

## 2026-04-23 に反映したデータ更新

変更コミット:

- `33c94a9 Fix NBA data update fallback`

主な更新ファイル:

- `data/games.csv`
- `data/po_games.csv`
- `data/po_series.csv`
- `data/po_player_per_game.csv`
- `data/po_player_totals.csv`
- `data/po_player_advanced.csv`
- `data/boxscores/0042500102.json`
- `data/boxscores/0042500142.json`

`data/po_games.csv` の追加行:

```csv
0042500102,2026-04-22,DET,ORL,98,83,W,0.459,0.231,0.325,0.25
0042500142,2026-04-22,OKC,PHX,120,107,W,0.473,0.35,0.459,0.355
```

`data/po_series.csv` の更新:

```csv
DET,ORL,1,1,2026-04-19,2026-04-22,1,First Round,,1-1
OKC,PHX,2,0,2026-04-19,2026-04-22,1,First Round,,2-0
```

---

## 運用確認手順

### Actions 実行後に確認すること

1. `Actions > Update NBA Data` の最新 run が `success` であること。
2. `Fetch data from NBA.com` が `success` であること。
3. `Check for changes` の後、差分がある場合は `Commit and push` が `success` になること。
4. 差分がない場合のみ `Commit and push` が `skipped` になること。

注意:

`Commit and push` が `skipped` でも必ず異常とは限らない。ただし、NBA.com 上で明らかに新しい Final 試合がある場合は、stale response または取得失敗を疑う。

### 14:00 / 21:00 枠の判断基準

| 状況 | 判断 |
|---|---|
| 試合なし + `Commit and push` が `skipped` | 正常 |
| 試合あり + 14:00枠が `skipped` | 21:00枠で回収できるか確認 |
| 試合あり + 21:00枠も `skipped` | 要調査 |
| `Fetch data from NBA.com` が failure | API timeout、仕様変更、スクリプト不具合などとして調査 |
| `Commit and push` が failure | push権限、branch protection、rebase conflict などとして調査 |

サイト表示だけでは Vercel / ISR キャッシュの影響で更新有無を判断しにくい。確認は GitHub Actions の最新 run、`Commit and push` step、GitHub 上の `data/` 差分または最新コミットを優先する。

### ローカル確認コマンド

```bash
python3 scripts/fetch-nba-data.py
git status --short
git diff --stat
```

`po_games.csv` の最新行を確認する場合:

```bash
tail -5 data/po_games.csv
```

新規 boxscore が作られたか確認する場合:

```bash
find data/boxscores -maxdepth 1 -type f | sort | tail
```

---

## 注意点

### `team_opponent.csv` と `player_shooting.csv`

README には以下のファイルが記載されているが、現在の `scripts/fetch-nba-data.py` では生成していない。

- `data/team_opponent.csv`
- `data/player_shooting.csv`

これらは過去の取得処理由来のファイルであり、今後も更新対象にする場合は `fetch-nba-data.py` に再実装が必要。

### 既存 boxscore の再取得

`fetch_boxscores()` は、既に `data/boxscores/{gameId}.json` が存在する場合、その gameId をスキップする。

そのため、既存 boxscore の live から final への更新や、後から修正された公式スタッツを再反映したい場合は、該当 JSON を削除してから再取得する必要がある。

### Vercel 側の表示反映

データ更新コミットが GitHub に push されると Vercel のデプロイ対象になる。

アプリ側は ISR / キャッシュの影響で、GitHub 上の `data/` 更新直後に表示が即時反映されない場合がある。README では 1時間キャッシュとしている。

---

## 関連コミット

| Commit | 内容 |
|---|---|
| `33c94a9` | NBA API stale response 対策、ScoreboardV2 補完、API リトライ、部分失敗時 exit、2026-04-22 PO 2試合のデータ更新 |
| `1d2614d` | GitHub Actions の定期実行を JST 14:00 / 21:00 の1日2回に変更 |
