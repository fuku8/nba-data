# NBA Data Dashboard - 実装プラン

## 概要

NBA のチーム・選手データを包括的に閲覧できる Next.js アプリケーション。
既存の `nba-ratin`（レーティング特化）を大幅に拡張し、取得可能なデータをできる限り網羅する。

**方針:** 個人選手の Net Rating（ORtg/DRtg/NRtg）は無料ソースで安定取得が困難なため対象外。
チームレベルの ORtg/DRtg/NRtg と、選手のアドバンスドスタッツ（PER/WS/BPM/VORP 等）で代替する。

---

## 1. データソース

### 主要ソース: Basketball Reference スクレイピング（全データ）

無料 API では取得できるデータが限定的なため、Basketball Reference を唯一の主要データソースとする。
スクレイピングは **ローカル実行 → Git push** で運用し、クラウドIPブロックの問題を回避する。

#### 取得対象ページと CSV マッピング

| BR ページ | URL パターン | 出力 CSV | 主要データ |
|---|---|---|---|
| シーズン概要（順位表） | `/leagues/NBA_2026.html` | `standings.csv` | 勝敗・勝率・ホーム/アウェイ成績・Streak・L10 |
| チーム基本スタッツ | `/leagues/NBA_2026.html` (Per Game テーブル) | `team_per_game.csv` | PTS/REB/AST/STL/BLK/TOV/FG%/3P%/FT% |
| チーム Opponent スタッツ | `/leagues/NBA_2026.html` (Opponent テーブル) | `team_opponent.csv` | 被PTS/被REB/被FG%等 |
| チーム Advanced | `/leagues/NBA_2026.html` (Advanced テーブル) | `team_advanced.csv` | ORtg/DRtg/NRtg/Pace/SRS |
| 選手 Per Game | `/leagues/NBA_2026_per_game.html` | `player_per_game.csv` | PTS/REB/AST/STL/BLK/TOV/FG%/3P%/FT%/MIN/GP |
| 選手 Totals | `/leagues/NBA_2026_totals.html` | `player_totals.csv` | シーズン合計スタッツ |
| 選手 Advanced | `/leagues/NBA_2026_advanced.html` | `player_advanced.csv` | PER/TS%/eFG%/USG%/OWS/DWS/WS/BPM/OBPM/DBPM/VORP |
| 選手 Shooting | `/leagues/NBA_2026_shooting.html` | `player_shooting.csv` | 距離別FG%/ゾーン別FG% |

#### データ取得フロー

```
ローカル PC (cron / 手動)
    ↓
scripts/fetch-bref-data.py
  ├─ Basketball Reference へアクセス（5秒間隔）
  ├─ pandas.read_html() でテーブル解析
  └─ data/ に CSV 保存
    ↓
git add + commit + push
    ↓
Vercel 自動デプロイ（push トリガー）
    ↓
Next.js Server Components が CSV 読み込み
    ↓
ISR キャッシュ（3600秒）
```

#### なぜ API ではなく スクレイピングか

| 選択肢 | 問題点 |
|---|---|
| stats.nba.com | クラウドIP（GitHub Actions / Vercel）からブロックされる |
| BallDontLie API 無料枠 | 5 req/min、チーム・選手・試合の基本情報のみ。スタッツは有料（$9.99〜） |
| BallDontLie 有料 | $9.99〜$39.99/月のコスト |
| nba_api (Python) | 内部的に stats.nba.com を使用 → 同じブロック問題 |
| Basketball Reference | 無料・豊富なデータ・ローカル実行なら安定 |

### 補助: BallDontLie API 無料枠（試合スコアのみ）

- **用途:** 当日の試合スコア・スケジュール取得（BR にはリアルタイム性がないため）
- **エンドポイント:** `GET /v1/games?dates[]=YYYY-MM-DD`
- **レート:** 5 req/min（ISR でキャッシュすれば十分）
- **API Key:** 無料取得 → `.env.local` に設定

---

## 2. ページ構成

### 2.1 ホーム (`/`)
- シーズン概要ダッシュボード
- リーグリーダー（得点・リバウンド・アシスト上位5名）
- 本日 / 直近の試合スコア（BallDontLie API）
- カンファレンス順位表（簡易版 Top 8）

### 2.2 順位表 (`/standings`)
- East / West カンファレンス別順位表
- 勝率・ホーム/アウェイ成績・直近10試合・連勝/連敗
- プレーオフ（1-6位）/ プレーイン（7-10位）/ ロッタリー（11位以下）区分表示
- チーム基本スタッツ付き（PTS/ORtg/DRtg/NRtg/Pace）

### 2.3 チーム一覧 (`/teams`)
- 全30チーム カード表示（カラー・勝敗・NRtg）
- ソート: 勝率 / NRtg / ORtg / DRtg / PTS
- フィルター: カンファレンス / ディビジョン
- 表示切替: カード / テーブル

### 2.4 チーム詳細 (`/teams/[teamId]`)
- **基本情報:** チーム名・カンファレンス・ディビジョン・勝敗
- **チームレーティング:** ORtg / DRtg / NRtg / Pace / SRS
  - 散布図（ORtg vs DRtg、当該チームをハイライト）
  - NRtg ランキングバーチャート
- **チーム基本スタッツ:** PTS / REB / AST / STL / BLK / TOV / FG% / 3P% / FT%
- **Opponent スタッツ:** 被PTS / 被FG% 等（守備力の指標）
- **ロスター:** 所属選手一覧（ポジション・GP・PTS/REB/AST/WS）
  - 選手名クリックで選手詳細へ
- **直近の試合:** BallDontLie API から最新10試合

### 2.5 選手一覧 (`/players`)
- テーブル表示（ページネーション 50件/ページ）
- **基本タブ:** PTS / REB / AST / STL / BLK / TOV / FG% / 3P% / FT% / MIN / GP
- **アドバンスドタブ:** PER / TS% / eFG% / USG% / WS / OWS / DWS / BPM / VORP
- ソート: 全カラム
- フィルター: チーム / ポジション / 最低出場試合数
- リアルタイム名前検索

### 2.6 選手詳細 (`/players/[playerId]`)
- **プロフィール:** 名前・チーム・ポジション・年齢
- **シーズン平均（Per Game）:** PTS / REB / AST / STL / BLK / TOV / FG% / 3P% / FT% / MIN
- **シーズン合計（Totals）:** 全カテゴリ合計値
- **アドバンスドスタッツ:** PER / TS% / eFG% / USG% / OWS / DWS / WS / BPM / OBPM / DBPM / VORP
- **シューティングスプリット:** 距離別・ゾーン別 FG%（データが取得できた場合）
- **スタッツレーダーチャート:** PTS/REB/AST/STL/BLK を正規化して表示

### 2.7 選手比較 (`/compare`)
- 最大4選手を選択して並列比較
- レーダーチャート（正規化: PTS/REB/AST/STL/BLK）
- アドバンスドスタッツ比較テーブル
- 並列バーチャート比較

### 2.8 試合結果 (`/games`)
- 日付別の試合スコア一覧（BallDontLie API）
- カレンダー UI で日付選択
- 各試合: ホーム/アウェイ・スコア・ステータス

### 2.9 リーダーズ (`/leaders`)
- スタッツカテゴリ別ランキング（上位20名）
- **基本:** PTS / REB / AST / STL / BLK / 3PM / FG% / 3P% / FT%
- **アドバンスド:** PER / TS% / WS / BPM / VORP
- 各カテゴリのバーチャート表示
- 最低出場試合数フィルター

### 2.10 検索 (`/search`)
- グローバル検索（選手名）
- インクリメンタルサーチ（2文字以上で発火）
- 検索結果カード（主要スタッツ付き）

---

## 3. 技術スタック

| カテゴリ | 技術 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | SSR/ISR/Server Components |
| 言語 | TypeScript | 型安全性 |
| スタイリング | Tailwind CSS v4 | ユーティリティファースト |
| UIコンポーネント | shadcn/ui | アクセシブル・カスタマイズ容易 |
| チャート | Recharts | React ネイティブ・豊富なチャート種類 |
| アイコン | Lucide React | 軽量・一貫性 |
| データ取得 | Server Components + CSV | シンプル・確実 |
| スクレイピング | Python (pandas + requests) | Basketball Reference 用 |
| 試合データ | BallDontLie API (無料枠) | 当日の試合スコア |
| デプロイ | Vercel | Next.js 最適化・Git push デプロイ |

---

## 4. ディレクトリ構成

```
nba-data/
├── data/                          # スクレイピングデータ（Git 管理）
│   ├── standings.csv
│   ├── team_per_game.csv
│   ├── team_opponent.csv
│   ├── team_advanced.csv
│   ├── player_per_game.csv
│   ├── player_totals.csv
│   ├── player_advanced.csv
│   ├── player_shooting.csv        # 取得可能な場合
│   └── last_updated.txt
├── scripts/
│   └── fetch-bref-data.py         # Basketball Reference スクレイピング
├── src/
│   ├── app/
│   │   ├── layout.tsx             # ルートレイアウト（ナビゲーション）
│   │   ├── page.tsx               # ホームダッシュボード
│   │   ├── standings/
│   │   │   └── page.tsx
│   │   ├── teams/
│   │   │   ├── page.tsx           # チーム一覧
│   │   │   └── [teamId]/
│   │   │       └── page.tsx       # チーム詳細
│   │   ├── players/
│   │   │   ├── page.tsx           # 選手一覧
│   │   │   └── [playerId]/
│   │   │       └── page.tsx       # 選手詳細
│   │   ├── compare/
│   │   │   └── page.tsx           # 選手比較
│   │   ├── games/
│   │   │   └── page.tsx           # 試合結果
│   │   ├── leaders/
│   │   │   └── page.tsx           # リーダーズ
│   │   ├── search/
│   │   │   └── page.tsx           # 検索
│   │   └── api/
│   │       └── revalidate/
│   │           └── route.ts       # ISR 再検証
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navigation.tsx
│   │   │   └── footer.tsx
│   │   ├── charts/
│   │   │   ├── scatter-chart.tsx   # ORtg vs DRtg 散布図
│   │   │   ├── bar-chart.tsx       # ランキングバーチャート
│   │   │   ├── radar-chart.tsx     # 選手比較レーダー
│   │   │   └── line-chart.tsx      # 時系列
│   │   ├── teams/
│   │   │   ├── team-card.tsx
│   │   │   ├── team-stats-table.tsx
│   │   │   ├── roster-table.tsx
│   │   │   └── standings-table.tsx
│   │   ├── players/
│   │   │   ├── player-card.tsx
│   │   │   ├── player-stats-table.tsx
│   │   │   └── player-search.tsx
│   │   ├── games/
│   │   │   ├── game-card.tsx
│   │   │   └── game-calendar.tsx
│   │   └── ui/                     # shadcn/ui
│   ├── lib/
│   │   ├── api/
│   │   │   └── balldontlie.ts      # 試合スコア取得
│   │   ├── data/
│   │   │   ├── teams.ts            # チーム CSV 読み込み
│   │   │   ├── players.ts          # 選手 CSV 読み込み
│   │   │   └── standings.ts        # 順位表 CSV 読み込み
│   │   ├── constants/
│   │   │   ├── teams.ts            # チーム略称・カラー定義
│   │   │   └── stats.ts            # スタッツ説明
│   │   ├── types.ts                # 型定義
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── public/
├── .env.local                      # BALLDONTLIE_API_KEY
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── plan.md
```

---

## 5. データモデル（TypeScript 型定義）

```typescript
// ===== チーム =====

interface TeamInfo {
  name: string;           // "Boston Celtics"
  abbreviation: string;   // "BOS"
  conference: "Eastern" | "Western";
  division: string;       // "Atlantic"
}

interface TeamStanding {
  team: string;           // チーム名
  wins: number;
  losses: number;
  win_pct: number;
  home_record: string;    // "25-10"
  road_record: string;    // "20-15"
  last_ten: string;       // "7-3"
  streak: string;         // "W3"
  gb: number;             // Games Behind
  conf_rank: number;
}

interface TeamPerGame {
  team: string;
  pts: number;
  reb: number;   // TRB
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
}

interface TeamAdvanced {
  team: string;
  off_rating: number;     // ORtg
  def_rating: number;     // DRtg
  net_rating: number;     // NRtg
  pace: number;
  srs: number;            // Simple Rating System
}

// ===== 選手 =====

interface PlayerPerGame {
  player: string;
  team: string;
  pos: string;            // ポジション
  age: number;
  gp: number;             // Games Played
  gs: number;             // Games Started
  min: number;            // Minutes Per Game
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
}

interface PlayerAdvanced {
  player: string;
  team: string;
  pos: string;
  age: number;
  gp: number;
  min: number;
  per: number;            // Player Efficiency Rating
  ts_pct: number;         // True Shooting %
  efg_pct: number;        // Effective FG%
  usg_pct: number;        // Usage Rate %
  ows: number;            // Offensive Win Shares
  dws: number;            // Defensive Win Shares
  ws: number;             // Win Shares
  ws_per_48: number;      // WS/48
  bpm: number;            // Box Plus/Minus
  obpm: number;           // Offensive BPM
  dbpm: number;           // Defensive BPM
  vorp: number;           // Value Over Replacement Player
  // 以下もBRで取得可能
  trb_pct: number;        // Total Rebound %
  ast_pct: number;        // Assist %
  stl_pct: number;        // Steal %
  blk_pct: number;        // Block %
  tov_pct: number;        // Turnover %
}

interface PlayerTotals {
  player: string;
  team: string;
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  // ... 全カテゴリ合計値
}

// ===== 試合（BallDontLie API） =====

interface Game {
  id: number;
  date: string;
  season: number;
  status: string;
  home_team_id: number;
  home_team_name: string;
  home_team_score: number;
  visitor_team_id: number;
  visitor_team_name: string;
  visitor_team_score: number;
}
```

---

## 6. スクレイピングスクリプト設計

### fetch-bref-data.py

```
実行フロー:
1. standings (順位表)       ← /leagues/NBA_2026.html
2. sleep(5)
3. team_per_game            ← /leagues/NBA_2026.html (別テーブル)
4. team_opponent            ← /leagues/NBA_2026.html (別テーブル)
5. team_advanced            ← /leagues/NBA_2026.html (別テーブル)
6. sleep(5)
7. player_per_game          ← /leagues/NBA_2026_per_game.html
8. sleep(5)
9. player_totals            ← /leagues/NBA_2026_totals.html
10. sleep(5)
11. player_advanced          ← /leagues/NBA_2026_advanced.html
12. sleep(5)
13. player_shooting          ← /leagues/NBA_2026_shooting.html (optional)
14. last_updated.txt 更新
```

- 各ページ間に5秒の待機（礼儀正しいスクレイピング）
- エラー時は該当 CSV をスキップして続行
- `pandas.read_html()` でテーブル解析
- 「League Average」行を除外
- チーム名の略称変換マップを定義
- **試合データは差分取得:** 既存 `games.csv` の最終試合日を読み取り、その月以降のみ Basketball Reference から取得。新規データを既存CSVに追記する形式で、毎回全9ヶ月分を取得する必要がなく、リクエスト数とActions実行時間を大幅に削減

### 運用方法

```bash
# ローカルで手動実行
cd ~/nba-data
python scripts/fetch-bref-data.py

# 自動化（crontab）
# 毎日 PM 06:00 JST に実行
0 18 * * * cd /Users/arakawahiroaki/nba-data && python scripts/fetch-bref-data.py && git add data/ && git commit -m "Update NBA data $(date +%Y-%m-%d)" && git push
```

---

## 7. 実装フェーズ

### Phase 1: セットアップ + データ層（1〜2日）
- [ ] Next.js プロジェクト初期化（TypeScript, Tailwind, ESLint）
- [ ] shadcn/ui セットアップ
- [ ] チーム定数・カラー定義（30チーム）
- [ ] スクレイピングスクリプト実装（fetch-bref-data.py）
- [ ] 初回データ取得・CSV 確認
- [ ] CSV 読み込みモジュール（lib/data/）
- [ ] 型定義（types.ts）
- [ ] BallDontLie API クライアント（試合スコア用）
- [ ] 基本レイアウト（ナビゲーション）

### Phase 2: コアページ（2〜3日）
- [ ] ホームダッシュボード（リーダー + 試合 + 順位概要）
- [ ] 順位表ページ（East/West + スタッツ）
- [ ] チーム一覧（カード + テーブル切替）
- [ ] チーム詳細（レーティング + スタッツ + ロスター）
- [ ] 選手一覧（基本 + アドバンスドタブ、フィルター、ソート）

### Phase 3: 詳細ページ + チャート（2〜3日）
- [ ] 選手詳細（プロフィール + 全スタッツ + レーダー）
- [ ] 選手比較（最大4人、レーダー + テーブル）
- [ ] 試合結果（日付選択 + スコア一覧）
- [ ] リーダーズ（カテゴリ別ランキング + バーチャート）
- [ ] 検索ページ
- [ ] チャート実装（散布図、バーチャート、レーダー）

### Phase 4: 仕上げ（1日）
- [ ] レスポンシブ対応
- [ ] ダークモード
- [ ] ローディング UI（Skeleton）
- [ ] エラーハンドリング・not-found
- [ ] Vercel デプロイ
- [ ] cron 設定（ローカルデータ更新）

---

## 8. 既存プロジェクトとの差分

| 項目 | nba-ratin（既存） | nba-data（新規） |
|---|---|---|
| データソース | CSV（GitHub API 経由） | BR スクレイピング（ローカル） + BallDontLie（試合） |
| チームデータ | ORtg/DRtg/NRtg のみ | 順位・勝敗・全スタッツ・レーティング・Opponent |
| 選手データ | WS（OWS/DWS）のみ | Per Game 全スタッツ + Totals + Advanced 全指標 |
| 選手 NRtg | なし | なし（無料ソースで安定取得不可） |
| 選手 WS/PER/BPM/VORP | WS のみ | 全て取得 |
| 試合データ | なし | 日付別スコア（API） |
| 順位表 | なし | カンファレンス別・詳細成績付き |
| リーダーズ | なし | カテゴリ別ランキング |
| 選手詳細 | なし | プロフィール + 全スタッツ + チャート |
| ページ数 | 5 | 10 |
| データ更新 | GitHub Actions（不安定） | ローカル cron（安定） |

---

## 9. 表示するスタッツ一覧

### チームスタッツ

#### 基本（Per Game）
PTS / REB (TRB/ORB/DRB) / AST / STL / BLK / TOV / PF / FGM / FGA / FG% / 3PM / 3PA / 3P% / FTM / FTA / FT%

#### アドバンスド
ORtg / DRtg / NRtg / Pace / SRS

#### Opponent（守備指標）
被PTS / 被FG% / 被3P% / 被FT%

### 選手スタッツ

#### 基本（Per Game + Totals）
GP / GS / MIN / PTS / REB (TRB/ORB/DRB) / AST / STL / BLK / TOV / PF / FGM / FGA / FG% / 3PM / 3PA / 3P% / FTM / FTA / FT%

#### アドバンスド
| 略称 | 正式名 | 説明 |
|---|---|---|
| PER | Player Efficiency Rating | 選手効率指標（リーグ平均=15.0） |
| TS% | True Shooting % | FG/3P/FT を統合した真のシュート効率 |
| eFG% | Effective FG% | 3P の価値を加味した FG% |
| USG% | Usage Rate | 出場中のポゼッション使用率 |
| OWS | Offensive Win Shares | 攻撃面の勝利貢献度 |
| DWS | Defensive Win Shares | 守備面の勝利貢献度 |
| WS | Win Shares | 総合勝利貢献度 |
| WS/48 | Win Shares per 48 Min | 48分あたり WS |
| BPM | Box Plus/Minus | ボックススコア +/-（リーグ平均=0.0） |
| OBPM | Offensive BPM | 攻撃 BPM |
| DBPM | Defensive BPM | 守備 BPM |
| VORP | Value Over Replacement | 代替選手と比較した価値 |
| AST% | Assist Percentage | チームメイトの FG にアシストした割合 |
| TRB% | Total Rebound % | リバウンド獲得率 |
| STL% | Steal Percentage | ポゼッションあたりのスティール率 |
| BLK% | Block Percentage | 相手 2P アテンプトのブロック率 |
| TOV% | Turnover Percentage | ポゼッションあたりの TO 率 |
