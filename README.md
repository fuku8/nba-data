# NBA Data Dashboard

2025-26シーズンのNBAデータを可視化するダッシュボード。Basketball Referenceからスクレイピングしたデータをもとに、チーム順位表・選手スタッツ・試合結果などを表示します。

## Features

- チーム順位表（カンファレンス別）
- チーム詳細ページ（ロスター・スタッツ）
- 選手スタッツ一覧（Per Game / Advanced / Totals）
- 試合結果一覧（日付・スコア）
- レスポンシブデザイン

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Charts**: Recharts
- **Data**: CSV files (Basketball Reference)
- **Deploy**: Vercel

## Data Pipeline

1. Playwright MCP で Basketball Reference からデータをスクレイピング
2. CSV ファイルとして `data/` ディレクトリに保存
3. Git push → Vercel が自動デプロイ

### CSV Files

| ファイル | 内容 |
|----------|------|
| `data/player_per_game.csv` | 選手 Per Game スタッツ |
| `data/player_advanced.csv` | 選手 Advanced スタッツ |
| `data/player_totals.csv` | 選手 Totals スタッツ |
| `data/games.csv` | 試合結果 |

## Setup

```bash
npm install
npm run dev
```

## Deploy

Vercel にリポジトリを接続するだけで自動デプロイされます。

```bash
# データ更新時
git add data/
git commit -m "update data"
git push
```
