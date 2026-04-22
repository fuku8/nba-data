# NBA Data Dashboard

2025-26シーズンのNBAデータを可視化するダッシュボード。NBA.com公式API（nba_api）からデータを取得し、チーム順位表・選手スタッツ・試合結果・プレーオフ特集などを表示します。

## Features

### レギュラーシーズン
- チーム順位表（カンファレンス別・Net Rating表示）
- チーム詳細（ロスター・Per Gameスタッツ・Advanced）
- 選手スタッツ一覧（Per Game / Advanced / Totals、ソート対応）
- 選手個人ページ（詳細スタッツ・比較）
- 試合結果一覧（日付移動）
- スタッツリーダーボード
- 選手検索・選手比較（レーダーチャート）

### プレーオフ（`/playoffs/*`）
- トップ（シリーズ状況 + リーダー）
- チームスタッツ（参加チーム一覧）
- チーム詳細（PO成績 + ロスター）
- 試合結果（日付移動）
- **試合詳細** `/playoffs/games/[gameId]`（クォーター別スコア + チームスタッツ比較 + 選手ボックススコア）
- 選手スタッツ一覧・リーダー・検索・比較

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Charts**: Recharts
- **Data**: CSV / JSON files (nba_api)
- **Deploy**: Vercel

## Data Pipeline

1. GitHub Actions が毎日 `scripts/fetch-nba-data.py` を実行
2. NBA.com 公式 API（nba_api）からデータ取得
3. `data/` ディレクトリに CSV / JSON として保存
4. Vercel が ISR（1時間キャッシュ）でサーブ

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

## Setup

```bash
npm install
npm run dev
```

### データ更新（ローカル）

```bash
pip install -r requirements.txt
python3 scripts/fetch-nba-data.py
```

## Deploy

Vercel にリポジトリを接続するだけで自動デプロイされます。データは GitHub Actions が毎日自動更新します（`.github/workflows/update-data.yml`）。
