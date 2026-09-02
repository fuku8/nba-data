# NBA Data Dashboard

2025-26シーズンのNBAデータを可視化するダッシュボード。NBA.com公式API（nba_api）からデータを取得し、チーム順位表・選手スタッツ・試合結果・プレーオフ特集などを表示します。

## Features

RS（レギュラーシーズン）と PO（プレーオフ）は「モード」ではなく、各ページ内の `/po` 切替と文脈バッジで示す（`plan.md` §12-2・§12-11）。

- トップ（順位・リーダー。PO期間中はブラケット）
- チーム順位表（カンファレンス別・Net Rating表示）
- チーム一覧（`/teams`、`/teams/po` でプレーオフ参加チームのスタッツ）
- チーム詳細（`/teams/[abbr]`: プレーオフ節（出場時）・ロスター・Per Game/Advanced・Season Heartbeat・ワンマン度Gini・ボール支配タッチシェア）
- 選手一覧（`/players`、`/players/po`。Per Game / Advanced、使われ方×効率マップ・シューターマップ）
- 選手個人ページ（`/players/[id]`、`/players/[id]/2025-26` で過去シーズン。進行中フェーズを上に表示、シーズン積み重ね表、プロフィール）
  - League Percentile・オールラウンド度レーダー・得点の作り方（ワッフル）
  - ショットチャート・縁の下の力持ち度（ハッスルレーダー）・運動量（走行距離/タッチ/保持時間）
  - プレイヤータイプ（7タイプ判定＋評価点）・PO 昇温/降温
- 試合結果（`/games`、`/games/po` で熱戦指数🔥とボックススコア `/games/[gameId]`）
- スタッツリーダーボード（`/leaders`、`/leaders/po`。USG% × TS% 四象限マップ）
- 選手検索・選手比較（`/compare`、`/compare/po`。レーダーチャート・優劣ハイライト）
- プレーオフ（`/playoffs`: トーナメント木ブラケット（PCは West-Finals-East、モバイルは最新ラウンド先の縦リスト）＋POリーダー）
- プレイヤータイプ別リーダーボード（`/types`）
- 指標解説ページ（`/metrics`）

旧URL `/playoffs/{players,leaders,compare,games,teams}` は `public/_redirects`（Cloudflare Pages）で新URLへ301。

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Charts**: Recharts
- **Data**: CSV / JSON files (nba_api)
- **Deploy**: Cloudflare Pages（静的エクスポート）

## Data Pipeline

1. ローカル macOS の launchd が毎日 JST 16:00 に `scripts/local-update.sh` を実行
2. NBA.com 公式 API（nba_api）からデータ取得（`fetch-nba-data.py` 毎日・`fetch-hustle-tracking.py` 毎日・`fetch-shotcharts.py` 日曜のみ）
3. `data/` ディレクトリに CSV / JSON として保存・push
4. Cloudflare Pages が push をトリガーに `next build`（静的エクスポート）して配信

### シーズンの持ち方

- 対象シーズンの単一の真実は `data/season.txt`（1行・例 `2025-26`）。アプリ（`src/lib/season.ts`）と fetch スクリプトの両方がこれを読む
- 現シーズンのデータは `data/` 直下、過去シーズンは `data/<season>/`（例 `data/2025-26/`）。`readCsvFile(filename, season)` で読み分ける
- **シーズン繰越**: 旧シーズン確定後・新シーズン初回取得前に `scripts/rollover.sh <old> <new>` を実行。`data/<old>/` スナップショットと `data/` 直下の差分ゼロを確認してから、フェーズ依存ファイル（`po_*.csv`・`boxscores/`・`shots/`・hustle/speed/possessions）を削除し `season.txt` を更新する。差分があれば中断するので、先にスナップショットを更新すること。**時期・手順・検証項目は `ROLLOVER.md`**（開幕直前に行う。早いと開幕まで RS ページが空表になる）

> **注意**: `stats.nba.com` は GitHub-hosted runner（クラウド IP）からのアクセスをブロックするため、GitHub Actions でのデータ取得は廃止。
> ローカル launchd（`~/Library/LaunchAgents/com.nba-data.update.plist`）で運用。
> 手動実行: `launchctl start com.nba-data.update` / ログ: `logs/update.log`

### データファイル

| ファイル | 内容 | ソース |
|----------|------|--------|
| `data/standings.csv` | チーム順位表 | LeagueStandingsV3 |
| `data/team_per_game.csv` | チームPer Gameスタッツ | LeagueDashTeamStats (Base) |
| `data/team_advanced.csv` | チームAdvancedスタッツ | LeagueDashTeamStats (Advanced) |
| `data/team_opponent.csv` | チーム被スタッツ | LeagueDashTeamStats (Opponent) |
| `data/player_per_game.csv` | 選手Per Gameスタッツ | LeagueDashPlayerStats (PerGame) |
| `data/player_totals.csv` | 選手Totalsスタッツ | LeagueDashPlayerStats (Totals) |
| `data/player_advanced.csv` | 選手Advancedスタッツ | LeagueDashPlayerStats (Advanced) |
| `data/player_shooting.csv` | 選手シューティングスタッツ | LeagueDashPlayerStats (Shooting) |
| `data/games.csv` | RS試合結果 | LeagueGameFinder (Regular Season) |
| `data/po_series.csv` | POシリーズ勝敗 | LeagueGameFinder (Playoffs) 集計 |
| `data/po_player_per_game.csv` | PO選手Per Gameスタッツ | LeagueDashPlayerStats (Playoffs, PerGame) |
| `data/po_player_totals.csv` | PO選手Totalsスタッツ | LeagueDashPlayerStats (Playoffs, Totals) |
| `data/po_player_advanced.csv` | PO選手Advancedスタッツ | LeagueDashPlayerStats (Playoffs, Advanced) |
| `data/po_games.csv` | PO試合結果 | LeagueGameFinder (Playoffs) |
| `data/boxscores/{gameId}.json` | 試合ボックススコア（PO） | BoxScoreSummaryV3 + BoxScoreTraditionalV3 |
| `data/player_profiles.csv` | 選手プロフィール（身長・体重・生年月日・デビュー年等） | CommonPlayerInfo（初回のみ手動取得） |
| `data/player_hustle.csv` / `po_player_hustle.csv` | ハッスルスタッツ（RS/PO） | LeagueHustleStatsPlayer |
| `data/player_speed.csv` / `po_player_speed.csv` | 走行距離・平均速度（RS/PO） | LeagueDashPtStats (SpeedDistance) |
| `data/player_possessions.csv` / `po_player_possessions.csv` | タッチ数・ボール保持時間（RS/PO） | LeagueDashPtStats (Possessions) |
| `data/shots/{playerId}.json` | 選手別ショット座標（RS/PO） | ShotChartDetail（初回のみ手動取得） |

## Setup

```bash
npm install
npm run dev
```

### データ更新（ローカル）

```bash
pip install pandas requests nba_api
python3 scripts/fetch-nba-data.py
```

### 選手プロフィール取得（初回のみ）

```bash
# 一括取得（約10分）
python3 scripts/fetch-player-profiles.py --batch 600

# 進捗確認のみ
python3 scripts/fetch-player-profiles.py --dry-run
```

取得済みデータはスキップされるため、途中で中断しても再実行で続きから取得できます。

### ハッスル・トラッキング / ショットチャート取得（手動ローカル実行）

```bash
python3 scripts/fetch-hustle-tracking.py   # ハッスル・走行距離・タッチ数（RS/PO）
python3 scripts/fetch-shotcharts.py        # 選手別ショット座標（RS/PO、初回のみ）
```

## Deploy

**Cloudflare Pages（静的エクスポート）**。`next.config.ts` の `output: "export"`（本番ビルドのみ）で `out/` を生成し、GitHub `main` 連携で push ごとに Pages がビルドする（データ更新の launchd push も同じ経路）。設定: Build command `npm run build` / Build output `out` / 環境変数 `NODE_VERSION=22`。旧URLのリダイレクトは `public/_redirects`。詳細と制限（20,000ファイル上限・過去シーズンの増え方）は `plan.md` §12-11。

RS/PO・シーズンはパス区分（`/players/po`・`/players/[id]/2025-26`）。静的エクスポートではクエリでビルド結果を変えられないため、`?phase=` `?season=` は使わない（`/compare?ids=` だけはクライアント側が読む）。
