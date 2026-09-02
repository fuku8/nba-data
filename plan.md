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

## 10. 次期拡張: 2026-27シーズン対応（PO/RS表示の整理・過去シーズン化）

> 2026-07-11 記録。2026-27開幕前に着手する。着手時はこのセクションを読んでから設計に入ること。**→ 2026-09-01 に検証・考察して実行プランを §12 にまとめた。着手は §12 から。**

### 課題認識（ふくたろう指摘）

- **PO/RSの表示が混乱する**: 現在は選手ページ内のPO/RSグループ分け＋`/playoffs`セクションの並存で、いま見ている数字がどちらの文脈か迷いやすい
- 2026-27開幕で2025-26が初の「過去シーズン」になる。過去分のナビゲート方法と、シーズン積み上げ（キャリア推移）・シーズン間比較の表示を設計したい

### 検討テーマ（開幕前に順に検討）

1. **データのシーズン確定・アーカイブ（最初にやるブロッカー）**
   - 現在の `data/*.csv` は毎日のBRスクレイピングで上書きされる前提。**2025-26のファイナル確定後にスナップショットを別ディレクトリ（例: `data/2025-26/`）へ確定保存**しないと、来季の取得開始時に過去分が消える
   - `scripts/fetch-nba-data.py` / `local-update.sh`（毎日PM6時JST cron）を「対象シーズン」を持つ構造に改修
2. **シーズンナビゲーション**
   - 全ページ共通のシーズンセレクタ（ヘッダー）か、URL設計（`/2025-26/players/...` or `?season=`）かを決める。mlb-dataの `?season=` 方式が既存の参考例
   - 「今シーズン」をデフォルトに、過去分は明示的に選ぶ形
3. **PO/RS表示の整理**（シーズン切替設計と同時に決めるのが効率的）
   - 案: シーズン×フェーズ（RS/PO）を1つの文脈スイッチに統合し、ページ内混在をやめる／文脈バッジを常時表示する等。選手ページのPO/RS2段表示（2026-07-04導入）の再評価を含む
4. **積み上げ・比較表示**
   - キャリア推移（シーズン別スタッツの折れ線・積み上げ）、選手のシーズン間比較（同一選手の2025-26 vs 2026-27）、compareページの「別シーズンの選手同士」比較など
   - 指標の年次比較はリーグ環境の変化（ペース・3P率）があるため、生値と併せてリーグ内パーセンタイル比較を検討
   - **実装手段の検討候補: flint-chart**（2026-08-03 追加・未採用）。`microsoft/flint-chart`（MIT）はチャート仕様を中間言語で1回書いて Vega-Lite / ECharts / Chart.js / Plotly / Excelネイティブへコンパイルする。ここで要る折れ線・積み上げは**feel-vizの守備範囲外**（feel-viz coreは水準の相対評価のみで時系列変化の翻訳を持たない）ため、翻訳層＝feel-viz／汎用チャート＝外部、という分界なら feel-viz の「チャートライブラリなし」方針を壊さずに済む。採用前にアクセシビリティ基準（feel-viz README §アクセシビリティの自前基準）・日本語ラベル・静的SVG書き出し可否を確認すること。詳細と未検証項目は `~/projects/feel-viz/README.md` §外部チャート層の候補

5. **HTML-in-Canvas の origin trial を検証する**（2026-08-26 追加・Clippings検証レポート_20260826で★4確認）
   - 対象: Canvas上のラベル・多言語テキストの折り返しに困る箇所。**現状 nba-data は Canvas 未使用**（`src/` に `<canvas>` / `getContext(` なし・描画は Recharts + 自前SVG）ので、§10-4 の積み上げ・比較表示や feel-viz 連携で Canvas 描画を選ぶ場面が出たときに、`fillText` で自前レイアウトを組む前にこちらを当てる
   - 仕様: WICG/html-in-canvas（提案段階・未確定）。`layoutsubtree` 属性 / `drawElementImage()` / `requestPaint()` / `paint` イベント / 戻り値 `DOMMatrix`。デモ3種（ワンショット転写・自動再描画・座標同期）は https://github.com/ics-creative/260825_html_in_canvas
   - 期限: **Chrome origin trial は Chrome 154 まで**（当初150、2026-06に延長。155は2026-10予定）。ローカル検証は `chrome://flags/#canvas-draw-element`。Firefox は未決着・Safari は2026-07から試験実装のみなので、公開サイトの本番採用は不可＝**検証止まり**が前提
   - 出典: https://ics.media/entry/260825/ 、https://developer.chrome.com/blog/html-in-canvas-origin-trial

### 備考

- bleague-dataにも同種の計画あり（bleague plan.md §7「2026-27シーズン対応」）。設計判断（シーズンセレクタのUI・URL設計）は両サイトで揃えると迷いが減る

## 11. 可視化の評価軸 — After the flood 5類型（2026-08-16採用）

スポーツデータ可視化のフォーマット5類型（After the flood, 2019。Clippings検証レポート_20260816で★4確認）を、**新しい可視化を足す・変えるときの評価語彙**として採用する。可視化の追加・変更時は「どの類型を強めるか」を1行で言えること。実装指令のTODOリストではない。§10の2026-27対応を検討する際は、この表とあわせて読むこと。

| 類型 | 定義 | 現状（2026-08-16調査） |
|---|---|---|
| ①ランキング時系列 | 順位変動の推移 | ほぼ無い（standings.csvは日次上書きの単一スナップショット・履歴なし）。**ただしgames.csv（全1,225試合の結果）から日付順の累積勝敗＝順位推移を再構成可能**で、npb-dataと違い履歴蓄積を待つ必要がない。§10-4のキャリア推移（シーズン間）とは別軸＝シーズン内の順位レース |
| ②相対的差異の露出 | 絶対値でなく差・乖離を主題化 | 部分的（パーセンタイル基軸・中央値クロス・Gini・PO昇温/降温バッジ=数少ない明示的差分は強い。**/compareの比較表は生値並置で差分・優劣表示ゼロ**が最大のギャップ。順位表もGB生値のみ） |
| ③軌跡 | 方向性・トレンド | 部分的（SeasonHeartbeatのみ。折れ線・移動平均・トレンド表現なし。Recharts導入済みだがLineChart未使用） |
| ④シーズン構造の動的表現 | 節目・リスクと機会 | 部分的（po_seriesの静的カードのみ。**残り日程データ自体が存在しない**=LeagueGameFinderは結果のみ取得。着手するならScheduleLeagueV2等の追加取得が前提で、npb-dataより一段手前から） |
| ⑤プレースタイル署名 | スタイルの定性ラベル化 | ある（player-types 7タイプ+z標準化・/types・ワッフル・ショットチャート・similar。5類型で最も充実）。2026-09-01 追加: リーダーズに守備版の STL×BLK マップ（USG×TS の対）。**リーダーズの図はそのページのリストにあるスタッツだけで組む**（ふくたろう指摘。hustle 系は個人ページの領域）。座標は per-game の丸めで重なる（156人中58点が先に置かれた点と同一座標になり隠れる）ため totals/GP で計算 |

②のギャップ（/compare差分・優劣表示）は **実装済み（2026-08-16・104daa4）**: npb-data の方式（`compare-diff.ts` の bestIndexes/formatDiff/diffFavors + 行定義への value/better/digits 拡張、npb `71a5f61` 時点）が**そのまま移植できる**: nba の比較表は npb と同じ向き（選手=行・スタッツ=列）で、`{label, get}` 行定義パターンも共通。実装は `src/lib/compare-diff.ts`（純ロジック+テスト5件）+ `src/components/compare-stats-table.tsx`（RS/PO両compareの表を共通化）。nba 固有事項は (a) better方向: DRtg のみ low・NRtg/ORtg/PTS 等は high・GP/MPG は向きなし、(b) RS版とPO版（/playoffs/compare）がほぼ全文コピーの2枚あるため両方に適用、(c) スタイリングは Tailwind クラスで。

### カラーマップ規約（2026-08-29追加）

連続量に色勾配を割り当てる可視化を足す・変えるときは、**タスク依存で使い分ける**（§10の2026-27対応で新規図を設計する際もこの規約に従う）:

- **連続量・順序・知覚距離の比較**（濃淡勾配で「どちらが大きいか・どれくらい違うか」を読ませる図）→ 知覚均等カラーマップ（viridis系等）。rainbow系は偽の境界を生み順序判断を阻害する
- **個別値の読み取り・カテゴリ弁別**（「どの帯・どのタイプに属するか」を同定する図。player-types 7タイプのような離散分類を含む）→ 色名で分節できる多色相マップも可。命名可能色が多いほど同定・推論課題で精度が上がる実測がある
- 既存実装（ショットチャート等）は再開時の変更対象になったものだけこの規約で見直す（規約適用のためだけの改修はしない）
- 出典: Eos記事＋反証 IEEE 2023「Rainbow Colormaps Are Not All Bad」・「Rainbows Revisited」。検証レポート_20260829。feel-viz README「§カラーマップの使い分け」と同内容（両サイトで揃える）

## 12. 2026-27シーズン対応 実行プラン（2026-09-01 検証・考察）

> §10の検討テーマ1〜4を現状コードで検証し、実行順に並べ直したもの。§10-5（HTML-in-Canvas）は対象外のまま。**着手時はこの節を読んでから Phase 0 に入る（§12-9 の判断6件は2026-09-01に確定済み）。**

### 12-1. 現状の診断（コードで確認した事実）

| 課題 | 原因（該当箇所） | 補足 |
|---|---|---|
| POページを見ていて上部ナビでRSに飛ぶ | `src/components/layout/navigation.tsx:69` `isPlayoffs = pathname.startsWith("/playoffs")`。**モードがURLの接頭辞だけで決まるグローバル状態**。選手ページ `/players/[id]` は RS/PO 共有なので、PO一覧から選手を開いた瞬間にモードがRSへ戻り、下段ナビの8項目が丸ごとRS版に差し替わる | `/types` `/metrics` も両モードに同居。トップ `/` はPOデータの有無で中身が入れ替わる（`page.tsx:142`）。「今どっちにいるか」を示す要素が上段トグルの色だけ |
| 選手ページでPOが上 | `players/[playerId]/page.tsx` の Stats表（PO行→RS行）・VisualGroup（PO→RS）・Advanced（PO→RS）の3箇所とも順序固定 | 2026-07-04導入。RSシーズン中はPOデータが無いので実害なし。問題は**過去シーズンを見るとき**と**PO期間中**の意味の違い |
| 2025-26を過去へ回す仕組み | スナップショットは `data/2025-26/`（dd37490・5.8MB・shots/boxscores込み）に**保存済み**。ただしアプリは `csv-utils.ts:5` `DATA_DIR = data/` 固定で読めない。`fetch-nba-data.py:25` `SEASON="2025-26"` はハードコード（hustle/shotsスクリプトは `fetcher.SEASON` を参照するので1箇所直せば連動） | **危険**: `po_games.csv`（fetch:414-419は非空時のみ書き込み）・`po_series.csv`・`boxscores/`・`shots/`・`player_hustle.csv` 等は開幕後もAPIが空を返す限り**旧ファイルが残る**。`isPlayoffDataAvailable()` は `po_player_per_game.csv` の行数だけ見るので、これがAPI失敗で残れば開幕初日に2025-26のPOが「現在」として出る |
| シーズン表記の埋め込み | `page.tsx:57` "NBA 2025-26 Dashboard"・`navigation.tsx:78`・`playoffs/client.tsx:73`・`players/[playerId]/page.tsx:101` "2026 PO"・`metrics/page.tsx:35,83,111` | 6箇所。シーズン定数を1つ作れば消える |
| トップが普通のダッシュボード | Best Off/Def/Net の数値カード＋リーダー5名×3＋順位表Top8。feel-viz図表はゼロ | 図表は選手ページ（8種）・チームページ（3種）・選手一覧（四象限2枚）・`/types` に散在。入口から見えない |
| チーム図表の偏り | Heartbeat（軸C）・ワンマン度Gini（軸A）・ボール支配（軸B）。後2つは「誰に依存しているか」の同型 | 5類型では①順位時系列・④シーズン構造がゼロ、③軌跡はHeartbeatのみ |

### 12-2. 設計判断①: RS/POは「モード」をやめ、データに文脈ラベルを付ける

**方針**: `/playoffs/*` の並行ツリー（6ページ＋client 6本）を廃止し、**単一ナビ＋各ページ内のフェーズ切替**にする。迷いの正体は「モードに入っている状態」を利用者が保持させられていることで、ページ遷移でモードが変わる限りナビは直せない。文脈をグローバルに持たず、**数字の横に必ず書く**（テーブル見出し・カード見出しに「Regular Season / Playoffs 2026」バッジ）。

| 現在 | 変更後 | 備考 |
|---|---|---|
| 上段トグル Regular Season / Playoffs | 削除。上段はロゴ＋**シーズンセレクタ**（§12-4） | |
| `/playoffs`（ブラケット＋POリーダー） | **残す**。ナビ名「プレーオフ」。PO期間中は目立たせる（例: 🏆バッジ）。開幕前は「開幕前」表示のまま | POは"イベント"としてのハブページ1枚に集約 |
| `/playoffs/teams`, `/playoffs/teams/[id]` | 削除 → `/teams/[id]` にPOセクション（シリーズ状況＋POロスター）を追加 | チームページのPO版は146行で情報量も少ない |
| `/playoffs/players`, `/playoffs/leaders`, `/playoffs/compare`, `/playoffs/games` | 削除 → `/players` `/leaders` `/compare` `/games` に ~~`?phase=po`~~ **`/po` パス（§12-11 で訂正。例 `/players/po`）** のセグメントコントロール（RS｜PO）をページ見出し直下に置く。**既定は常にRS**。PO期間中はコントロールをオレンジで強調しつつ既定は変えない（既定が時期で変わること自体が迷いの原因） | `compare` はRS版とPO版がほぼ全文コピー（§11に既記）。統合で重複が消える |
| `/playoffs/games/[gameId]`（ボックススコア） | `/games/[gameId]` へ移動（RSボックススコアは未取得なのでPO試合のみ存在。RS試合はNBA.comリンクのまま） | |
| `/playoffs/layout.tsx`（body class） | 削除 | |

**ブラケットの表示形式（2026-09-01 検証・ふくたろう指摘）**: 現在の `/playoffs` は `ROUND_ORDER=[1,2,3,4]` で1回戦→ファイナルの順にカードを縦に並べている（`playoffs/client.tsx`）。主要サイトの「通常の形」は**トーナメント木**で、1回戦が左右の外側・ファイナルが中央（ESPN: 左=West・右=East・中央=NBA Finals、見出し "1st Round / Conf. Semifinals / Conf. Finals / NBA Finals / …" が左右対称。Wikipedia も同じ向き）。カードを縦に並べる形式自体が標準にない。**ESPN・Wikipedia のリスト（DOM順・本文節順）は1回戦が先の時系列**で、「ファイナルが先」は確認できなかった。NBA.com のブラケットページと Basketball Reference は取得不可（タイムアウト・403）のため**未確認**。

決定:
- **PC幅（lg以上）はトーナメント木に描き替える**。左=West 1回戦(4)→2回戦(2)→カンファレンス決勝(1)、中央=ファイナル、右=East の鏡像。純CSS grid（行=8スロット、列=7）。`po_series.csv` にカンファレンス・シードは無いが、カンファレンスは `NBA_TEAMS[abbr].conference`、木の中の位置は `standings.csv` の `PLAYOFF_RANK`（上位シードで 1-8 / 4-5 / 3-6 / 2-7 の順に置くと2回戦以降の線が自然に繋がる）から決まる。**シード順の配置規則は実装時に2025-26データ（15シリーズ）で全経路を検証する**
- **モバイル幅は縦リストに退避し、順序は「最新ラウンドが先」**（ファイナル→カンファレンス決勝→2回戦→1回戦）。これは標準ではなく判断: 進行中は最新ラウンドが関心の中心、終了後はファイナルの結果が見出しになる。ESPN のリスト順（1回戦が先）とは逆になるが、木を持たない縦リストでは「いま何が起きているか」を先に出す方が読み手の目的に合う
- 進行中のシリーズは木の中でも強調（既存の「進行中」バッジを流用）。PO開幕前は現行の「開幕前」表示のまま
- 実装位置: Phase 1 の手順3（`/teams/[id]` PO統合）の後に追加（§12-8）

**データ層**: `getPlayerPerGame()` / `getPlayoffPlayerPerGame()` の対を `getPlayerPerGame({ season, phase })` に統合（totals/advanced/hustle/speed/possessions/games も同様）。`player-types.ts` の `FILES[Season]` は既にこの形（`rs`/`po` キー）なので、それを全ローダーに広げるだけ。

**検証**: いま `data/` にRS・PO両方の2025-26データがあるので、統合UIを**開幕前に実データでテストできる**。開幕後はPOデータが空になり、PO側の検証は2027年4月まで不可能になる。→ **Phase 1 は9月中に終える理由**。

### 12-3. 設計判断②: 選手ページの順序は「進行中のフェーズを上」、過去は積み重ね表

- **順序ルール**: `poFirst = (season === CURRENT) && POデータあり`。つまり当該シーズンのPO期間中だけPOが上、それ以外（RS進行中・過去シーズン閲覧）はRSが上。1つの真偽値で済み、「いま起きていること」が上に来る
- **Stats表をシーズン積み重ねに**: 行＝`2026-27 RS / 2025-26 PO / 2025-26 RS …`（Basketball Reference型）。§12-4のローダーが `season` を取れるようになれば、`SEASONS` を回して行を作るだけ。Advanced表も同じ
- **feel-viz図表（VisualGroup）は選択中シーズンのみ**。8種×シーズン数を縦に並べると読めなくなる。過去シーズンの図表はシーズンセレクタで切り替えて見る
- **前季比（Phase 3・12月以降）**: League Percentile の各行に前季の位置を薄い印で重ね、変化を言葉にする（「得点 上位12%→上位4%」）。生値の年次比較はリーグ環境（ペース・3P率）で歪むため**パーセンタイル差のみ**を扱う（§10-4の懸念への回答）。bleague plan §7-4「生値比較と相対値比較を区別する」と同じ判断
- **flint-chart（§10-4候補）は採用しない**: 2シーズンの折れ線は2点＝差分でしかなく、キャリア推移が意味を持つのは3シーズン（2028年春）以降。PercentileBars への前季マーカー追加で足りる。再検討は3シーズン目のデータが揃ってから

### 12-4. 設計判断③: シーズンの持ち方は `?season=` クエリ、データは `data/<season>/` に読み分け

**URL**: ~~`?season=2025-26`（省略＝現シーズン）~~ → **2026-09-01 訂正（§12-11）: パス区分 `/players/[id]/2025-26`（省略＝現シーズン）。** Cloudflare Pages への静的エクスポートではクエリでビルド結果を変えられないため。以下の「クエリ方式の代償」の段落は訂正前の検討記録として残す。mlb-data の `seasonOrDefault`（`src/lib/data/normalizers.ts:19`）と同型。パス方式（`/2025-26/teams/OKC`）は全ルートに `[season]` ラッパーが要り、ページ数が倍になる。クエリ方式の代償は `searchParams` を読むページが動的レンダリングになることだが、CSVは583行規模で `compare` が既に `searchParams` で動いており実害なし。**bleague plan §7-3 は「`/2025-26/...` 例」と書いてあるので、この決定に合わせて修正する**（両サイトで揃える、§10備考）。

**ファイル配置**: 現シーズン＝`data/`（fetchスクリプトの書き先を変えない）、過去＝`data/<season>/`。`readCsvFile(filename, season?)` が `season === CURRENT ? data/ : data/<season>/` に解決。`shots.ts` `games.ts:96`（`getLatestGameDate` の直接パス）も同じ解決関数を通す。

**シーズン定数**: `src/lib/season.ts` に `CURRENT_SEASON`・`SEASONS`（新しい順）・`resolveSeason(param)`・`seasonLabel`。値の出どころは `data/season.txt`（ロールオーバー時に書き換える1行ファイル）。fetchスクリプトも同じファイルを読む（`SEASON = open("data/season.txt").read().strip()`）。日付からの自動導出は「7〜9月は前季扱い」の境界を毎年考えることになるので採らない。

**ロールオーバー手順**（`scripts/rollover.sh <old> <new>`、冪等・実行前に確認プロンプト）:
1. `data/<old>/` が存在し、`data/*.csv` と差分が無いことを確認（差分があればスナップショットが古い＝中断）
2. `data/` 直下のフェーズ依存ファイルを削除: `po_*.csv`, `boxscores/`, `shots/`, `player_hustle.csv`, `player_speed.csv`, `player_possessions.csv`, `player_shooting.csv`（BR由来・未生成・README注記済みの死蔵ファイル。`team_opponent.csv` も同様）
3. `data/season.txt` を `<new>` に書き換え
4. `git commit`（データ更新コミットとは分ける）
- **検証**: ロールオーバー直後に `npm run build` → トップが「開幕前」、`/playoffs` が「開幕前」、`/players/203999?season=2025-26` に2025-26のRS・POが出ること。**手順1で差分が無いことを機械で確認するのが本体**。手作業で消して回るとどれかが残る（§12-1の危険）

**シーズン中の取得**: `local-update.sh` に `fetch-hustle-tracking.py`（API 5呼び出し）を毎日、`fetch-shotcharts.py`（46呼び出し）を**週1**で追加。`/types` と選手タイプは `data/shots/` に依存（`player-types.ts` rimShare。無いとプールから外れる）ので、shotsが更新されないと2026-27のタイプ判定が一切出ない。

**序盤のGP下限**: `MIN_GP=20` 固定だと11月末まで League Percentile・タイプ・レーダーが全員非表示になり、サイトの特徴が2か月消える。`MIN_GP = clamp(round(リーグ最大GP × 0.5), 5, 20)` に変える（「ローテ選手＝出場率5割以上」の意味は保たれる。`// ponytail:` で上限20に戻る旨を明記）。母集団が日々変わるのはシーズン序盤の本質なので許容し、パーセンタイル注記に「GP◯以上」を動的に出す（既に `pctNote` で出している）。

### 12-5. 設計判断④: 比較は単一シーズン、同一選手の前季比は選手ページで

- `/compare` は**選択中シーズン内の最大4人**のまま。レーダーはシーズン内プールのパーセンタイル正規化なので、別シーズンの選手を混ぜると「どのプールに対する位置か」が図から読めなくなる
- 「2025-26のSGA vs 2026-27のSGA」は §12-3 の前季比（選手ページ）が担う。比較ページで `203999@2025-26` のようなID記法を入れるのは、要望が出てから（YAGNI）
- 「似たタイプの選手」（`similar.ts`）もシーズン内のみ

### 12-6. 設計判断⑤: トップページは「きょうの見どころ」＋図表を直接置く

sumo-data `src/lib/midokoro.ts` の型（ビルド時に最大3枚を決定論的に選ぶ。場所中は事件系を優先、場所間は分析系プール）をそのまま移す。**LLMは通さない**（feel-viz原則: 数字は決定論的変換のみ）。

**カード候補プール**（既存データだけで計算可能。各カードに小図表を1つ埋め込む）:

| 種別 | 条件 | ラベル例 | 埋め込む図表 |
|---|---|---|---|
| 事件（シーズン中） | 直近日の点差≤3の試合 | 「昨夜の接戦: OKC 125-124 HOU」 | 両チームのHeartbeat末尾10試合 |
| 事件 | 現在の連勝/連敗が5以上 | 「DET 7連勝中」 | Heartbeat |
| 事件（PO中） | 熱戦指数≥10のPO試合 | 「🔥🔥 SAS-MIN 2点差」 | 既存の🔥表示 |
| 分析 | ワンマン度1位/30位 | 「HOUは得点の21%をKD一人が」 | ローレンツ曲線 |
| 分析 | タイプ評価点1位（週替わり: 曜日でタイプを回す） | 「今週のスコアラー1位: SGA」 | PercentileBars 3行 |
| 分析 | 順位レース（§12-7）で直近10試合の勝率上昇幅最大 | 「上昇中: HOU（西8位→5位）」 | 順位レース折れ線（当該チーム強調） |
| 分析（PO中） | 昇温幅最大 | 「八村塁 PO昇温 +9.0pt」 | 昇温バッジ |

**トップの構成**（上から）: (1) シーズン状態1行（「2026-27 Regular Season · 42試合消化 · データ反映 12/20」） (2) 見どころ3枚 (3) 順位表Top8×2に**各チームの直近10試合Heartbeat（幅120px）**を1列足す（順位表が「感じる」側に寄る最小改修） (4) リーダー3枚（現行のまま）。Best Off/Def/Net カードは (3) にNRtg列があるので削除。

**トップの PO/RS タブ（2026-09-01 実装・ふくたろう指摘「トップにRSが無いのは不自然」「トップが /playoffs と同じ」）**: トップ `/` と `/playoffs` は同じ `HomeDashboard`（`src/app/home-dashboard.tsx`）を **Regular Season｜🏆 Playoffs の2タブ**で描き、初期タブだけ違う（`/`=RS、`/playoffs`=PO）。既定は時期で変えない（§12-2 と同じ理由）。RSタブ＝順位表（東西横並び・15行・6位下にPO線・10位下にプレイイン線）＋リーダー3枚（`StatLeaders` をPOと共用）。Best Off/Def/Net は §12-9-6 どおり消した。POデータが無い時期はタブなしでRSパネルだけ。**スマホ**は縦長対策として、ブラケットの縦リストを1行表示「NYK 4-1 SAS」に変え、`<details>` でファイナル・カンファレンス決勝と進行中ラウンドだけ開き、終わった1・2回戦とリーダーは畳む（`/playoffs` も同じ部品なので同時に反映）。順位表はスマホでも2列（略称・text-xs）。検討して**やらなかった**こと: タブとURLハッシュの同期（必要になれば `Tabs` の `value` を hash に繋ぐ）、`/playoffs` ページの廃止（ナビの入口を残す方を選んだ）。上記 (2) 見どころ・(3) Heartbeat 列は開幕後の Phase 2 のまま。

**「特徴を前面に出す仕組み」**: `/metrics`（指標解説・11項目）を「図表カタログ」に格上げし、各項目に**実データの図を1枚**貼る（現在は文章のみ）。ナビ名は「図表」。トップの見どころカードの図表は必ずカタログの該当項目へリンクする。サイトの独自性は"図表の種類"なので、その一覧が入口になる。

### 12-7. 設計判断⑥: チームページに足す図表（優先順）

評価語彙は §11 の5類型＋2026-07-04レポートの4軸（A文脈/B形状/C時間/D物理）。**追加取得ゼロ**で作れるものを先に、テーマが「依存度」に偏らないよう選ぶ。

| 優先 | 図表 | 類型/軸 | データ | 計算 | 備考 |
|---|---|---|---|---|---|
| 1 | **順位レース**（カンファレンス内の累積勝率推移。当該チーム強調・他は薄灰） | ①/C | `games.csv` | 日付順に累積W-Lを全30チーム分再構成（§11①で「再構成可能」と判定済み） | 純SVG折れ線（polyline）。Rechartsは不要。トップの見どころ「上昇中」と共用 |
| 2 | **点差の安定性**（全試合の点差分布ストリップ。P25–P75帯＋中央値＋今季平均） | ③/A | `games.csv` | feel-viz `quantiles`/`spreadRatio` 相当（nbaはvendor未導入なので同アルゴリズムを `lib` に置く） | 「安定型 / ジェットコースター型」の言葉に翻訳。閾値は30チームの分布を見て**人が固定**（feel-viz原則: データから自動確定しない） |
| 3 | **ロスターのタイプ構成**（7タイプ×人数のバッジ雲） | ⑤/B | `player-types.ts` | チーム所属選手のバッジを集計 | 「スコアラー2・3&D3・番人1」でチームの形が出る。既存計算の再利用のみ |
| 4 | **得点の作り方（チーム版）＋3P依存度** | B | `team_per_game.csv` FG3M/FGM/FTM | 選手版ワッフルと同じ恒等式。3P由来得点比率のリーグ内順位を添える | `ScoringWaffle` 再利用 |
| 5 | **ホーム/ロード耐性**（道場破り指数＝ロード勝率−ホーム勝率のリーグ内位置） | A | `standings.csv` HOME/ROAD | 30チームのパーセンタイル | 2026-07-04レポート未検証候補の消化 |
| 6 | **泥臭さ・運動量（チーム合計）** | A/D | `player_hustle.csv`, `player_speed.csv` | 選手値×G を合算し試合数で割る | チームレベルの30チーム分布はnが小さいので言葉は5段階でなく順位のみ |
| 7 | 対戦相手別の点差（30マス ヒートマップ） | ②/A | `games.csv` | チーム×相手の平均点差 | §11カラーマップ規約: 連続量→知覚均等マップ |
| 保留 | 残り日程の難度（④シーズン構造） | ④ | **未取得**（`ScheduleLeagueV2` 要検証） | 残り試合の相手勝率平均 | fetch拡張が前提。§12-8 Phase 4 |
| 保留 | RS熱戦指数 | C | RSボックススコア**未取得**（1,230試合×2呼び出し） | — | 取得コストが大きい。点差≤3を「接戦」の代理指標にして見どころに使う（上表の事件カード） |

ページが長くなるので、既存3図と合わせて3群に分ける: **流れ**（Heartbeat・順位レース・安定性）／**人格**（ワンマン度・ボール支配・タイプ構成・得点の作り方）／**土台**（ホーム/ロード・泥臭さ・数値表・ロスター）。

### 12-8. フェーズと検証（`1.[ステップ] → 検証: [確認方法]` 形式）

開幕（例年10月下旬）までに Phase 0・1 を終える。**Phase 1 は PO データが手元にある9月中に**（§12-2の検証理由）。

**Phase 0: シーズン基盤（ブロッカー・最初に）** — ✅ 2026-09-01 実装・検証済み（下記1〜5）。判明事項: `~/Library/LaunchAgents/com.nba-data.update.plist` が**存在しなかった**（`logs/update.log` の最終実行は 2026-06-14）。plist を再作成したが `launchctl load` は未実施 → 開幕前に `launchctl load ~/Library/LaunchAgents/com.nba-data.update.plist` を手で実行する。旧 `getLatestGameDate` は `games.ts:96` にも重複定義があり未使用（削除は依頼があれば）。Codexレビュー3件（rollover の OLD 未検証・hustle/shots 部分失敗の混在コミット）は修正済み（次コミット）。**開幕後の初回取得で要確認**: PO開幕前に `LeagueDashPlayerStats(Playoffs)` が空フレームを返して `po_player_per_game.csv` がヘッダーのみで書かれるか（例外なら旧ファイルは無いので `isPlayoffDataAvailable()` は false のまま＝表示は正しいが、`logs/update.log` に失敗が毎日出る）
1. `data/season.txt`＋`src/lib/season.ts`＋`readCsvFile(filename, season?)` の読み分け → 検証: `resolveSeason` のテスト（不正値→現季・既知値→そのまま）、`/players/203999?season=2025-26` で現行と同じ数値
2. `fetch-nba-data.py` の `SEASON` を `season.txt` から読む → 検証: `python3 -c` で値表示。hustle/shots スクリプトが連動することを `grep fetcher.SEASON` で確認
3. `scripts/rollover.sh` → 検証: 一時ディレクトリにコピーしたリポジトリで実行し、削除対象が消え・スナップショットが残り・`season.txt` が更新されること。差分がある状態で実行すると中断すること
4. シーズン文字列6箇所を `seasonLabel` に置換 → 検証: `grep -rn "2025-26\|2026 PO" src` が0件
5. `local-update.sh` に hustle（毎日）・shots（日曜）を追加 → 検証: `launchctl start` で手動実行しログ確認

**Phase 1: RS/PO統合（9月中）** — ✅ 2026-09-01 実装（手順1〜6・コミット 902fa8f〜）。実装上の判断: (a) 旧 `/playoffs/*` は削除ではなく `next.config.ts` の `redirects()` で新URLへ308（ブックマーク互換。ページファイルは削除待ち＝`git rm -r src/app/playoffs/{players,leaders,compare,games,teams}`。`/playoffs/page.tsx`・`client.tsx`・`layout.tsx` は残す） (b) シーズン切替 `SeasonSwitch` は選手ページのみに置いた（`?season=` を読むページにだけ出す。ナビ上段に置くと読まないページで無視されて迷いの元になる）。他ページへの拡張は前季比（Phase 3）と同時に (c) 選手ページの Stats 表は `allSeasons()` を回すので、ロールオーバー後に自動で2シーズン積み重ねになる。**ロールオーバー直後に `?season=2025-26` でRSが上・POが下になることを実確認する**（現データでは現シーズン＝PO上しか検証できていない）
1. ローダー統合 `get*({ season, phase })` → 検証: 既存ページの数値が変わらないこと（ビルド後、Jokić/SGA/OKC/HOU の主要値を現行HTMLと突合）
2. `/players` `/leaders` `/compare` `/games` に `?phase=po` セグメント＋文脈バッジ → 検証: PO切替でPO値、リンク先の選手ページでもバッジ表示
3. `/teams/[id]` にPOセクション統合、`/games/[gameId]` 移動 → 検証: `/playoffs/teams/OKC` を削除しても内容が `/teams/OKC` に全部ある
4. `/playoffs` ブラケットをトーナメント木（PC）＋最新ラウンド先の縦リスト（モバイル）に描き替え → 検証: 2025-26の15シリーズ（8+4+2+1）が木の正しい位置に入り、NYK-SAS が中央、West/East の1回戦が4組ずつ外側。`lg` 未満で縦リストがファイナル→1回戦の順
5. `/playoffs/*` 6ページ・layout・client削除、ナビ単一化 → 検証: `next build` のページ数減、リンク切れ0（全ページのhrefを収集し200確認）
6. 選手ページの順序ルール・シーズン積み重ね表 → 検証: `?season=2025-26` でRSが上、現季でPOあればPOが上
7. codex-reviewer でレビュー（系統=Codex）。0件なら4点セットで台帳記録

**Phase 2: トップと図表（10〜11月・開幕後の実データで）**
1. 順位レース（`lib/data/race.ts`＋純SVG）→ 検証: 最終日の累積W-Lが `standings.csv` と30チーム全一致
2. 見どころカード（`lib/midokoro.ts` 移植）→ 検証: 事件プール空（開幕前）で分析系3枚、開幕後は事件優先
3. トップ再構成・順位表Heartbeat列 → 検証: 実レンダリング
4. 図表カタログ（`/metrics` に実図）→ 検証: 11項目に図
5. チーム図表 §12-7 の 2〜5 → 検証: 各計算をPythonで独立に再計算し一致（2026-07-04と同じ流儀）
6. GA4（2e67393で導入済み）で**11月末にページ別・図表別の閲覧を見て**、12月以降の優先順位を決める。データが無い状態で順位を固定しない

**Phase 3: 前季比（12月・GP20到達後）**
1. PercentileBars に前季マーカー＋差分の言葉 → 検証: 2025-26 vs 2026-27 で同一選手（トレードなし）3名の差分が生値の方向と矛盾しない
2. タイプ変化（「シューター→3&D」）の表示

**Phase 4: 要検証の追加取得（着手判断は Phase 2-6 の後）**
- `ScheduleLeagueV2`（残り日程→④）・`leaguedashplayerclutch`（勝負強さ）。**エンドポイントの応答をローカルで1回叩いてから**設計する（GitHub Actions不可の前提は変わらない）

### 12-9. 判断（2026-09-01 ふくたろう「OK」＝6件すべて推奨どおりで確定）

推奨を先頭に書く。

1. **`/playoffs/*` の並行ツリーを削除してよいか**（推奨: 削除。§12-2）
2. **URLは `?season=` クエリでよいか**（推奨: クエリ。bleague plan §7-3 の例を合わせて直す）
3. **選手ページの順序「進行中フェーズが上」でよいか**（推奨: はい。過去シーズン閲覧時は常にRS上）
4. **比較はシーズン内のみでよいか**（推奨: はい。前季比は選手ページ）
5. **序盤のGP下限を動的にしてよいか**（推奨: はい。§12-4）
6. **トップの Best Off/Def/Net カードを消してよいか**（推奨: 消す。順位表のNRtg列で足りる）

### 12-10. やらないと決めたこと

- flint-chart 導入（§12-3。3シーズン目まで再検討しない）
- 比較ページの複数シーズン混在（§12-5）
- RSボックススコア全取得（§12-7保留）
- サイト全体のアートディレクション変更（テーマバンク `data-impact` 附則のNBA×ディザ等）。図表の種類と入口を直すのが先で、質感は別テーマとして扱う

### 12-11. Cloudflare Pages 移行（静的エクスポート）— 2026-09-01 追加・Phase 1 の直後に実施

**目的**: ホスティングを kokkai-data と同じ Cloudflare Pages（静的エクスポート）に揃える。動機は無料枠の大きさとドメイン運用の統一で、Vercel の枠が逼迫しているわけではない（ふくたろう 2026-09-01）。**自動化は失わない**: 毎日の launchd → push → Pages がビルド、という経路は Vercel と同じ。むしろ現状は Phase 1 で `?phase=` `?season=` を読む5ページが動的（毎閲覧でサーバー関数）になっており、静的化はそれを消す方向。

**Phase 2 の前にやる理由**: 移行の本体は「クエリで表示を変える設計」の解消で、ページが増える前が一番安い。トップの「見どころ」（§12-6）もビルド時計算で成立する（sumo-data と同型）。

**Next 16 同梱ドキュメント（`node_modules/next/dist/docs/01-app/02-guides/static-exports.md` §Unsupported Features）で確認した非対応**: `generateStaticParams` 無しの動的ルート・`dynamicParams: true`・`redirects()`/`rewrites()`/`headers()`・ISR（`revalidate`）・Proxy・Server Actions・Route Handlers（Request依存）・Image最適化（既定 loader）。nba-data で該当するのは動的ルート2つ・`redirects()`・`revalidate` 14箇所。

**変更（コード側）**:

| # | 項目 | 変更 |
|---|---|---|
| 1 | フェーズのURL | `?phase=po` → `/players/po` `/leaders/po` `/compare/po` `/games/po` `/teams/po`。各ページは `page.tsx`（RS）と `po/page.tsx`（PO）の薄いラッパーから共通の描画関数を呼ぶ。POデータが無いシーズンの `/po` は「開幕前」表示（静的） |
| 2 | シーズンのURL | `?season=` → `/players/[playerId]/[season]`（省略＝現シーズン）。`generateStaticParams` は過去シーズン×その季の選手 |
| 3 | 比較の初期選択 | `/compare?ids=` はページが読まず、クライアントの `useSearchParams`（`Suspense` で包む）で読む。静的HTMLは同じで、クエリはブラウザ側だけが解釈する |
| 4 | `generateStaticParams` | `/players/[playerId]`（現季の per_game＋PO の全選手）・`/games/[gameId]`（`data/boxscores/` の一覧）に追加。`dynamicParams = false`（kokkai-data と同じ） |
| 5 | `revalidate` | 14箇所を削除（ISRは非対応。更新は push ごとのビルド） |
| 6 | リダイレクト | `next.config.ts` の `redirects()` を廃止し `public/_redirects`（Cloudflare 形式）へ。旧 `/playoffs/*` 7本 |
| 7 | 更新時刻 | `getPoDataTimestamp`（ファイル mtime）を廃止し、`po_games.csv` の最終試合日に置換。Pages のビルドでは checkout 時刻が mtime になり誤表示するため |
| 8 | `next.config.ts` | `output: process.env.NODE_ENV === "production" ? "export" : undefined`（kokkai-data と同じ本番限定。dev で有効化すると動的ルートが壊れる実測あり） |
| 9 | 切替UI | `PhaseSwitch` / `SeasonSwitch` の href をパス生成に変更。見た目と文脈バッジは不変 |

**検証**: `npm run build` で `out/` に `players/203999.html`・`players/po.html`・`games/0042500405.html`・`teams/po.html` 等が生成されること（動的ルートの漏れはビルドエラーで検出）。`out/` の可視テキストを Phase 1 のHTMLと突合（トップ・チーム・選手・PO）。`node --test` 19件。旧URLの301は Pages 上でしか検証できないので、接続後に `curl -I` で確認。

**Cloudflare 側（ふくたろう作業・コードが整った後）**: Pages プロジェクト作成 → GitHub `main` 連携 → Build command `npm run build`・Output `out`・環境変数 `NODE_VERSION`（ローカルは v25、Pages 既定は古いので明示）→ `*.pages.dev` で表示確認 → `_redirects` の301確認 → 必要なら独自ドメイン → Vercel プロジェクト削除。launchd の次回 push で Pages が自動ビルドすることを Deployments で確認。

**実測（2026-09-01）**: 初回ビルドは 808MB・12,271ファイルだったが、半分は `data/2025-26/`（現季と同名のスナップショット）が過去季扱いされて `/players/[id]/2025-26` が583ページ重複生成されたもの（Codexレビューで検出→`archivedSeasons()` が現季を除外）。修正後は **377MB・6,451ファイル**（選手ページ1人あたり HTML 349KB＋RSC `.txt`＋セグメント用ディレクトリ7ファイル≒9ファイル/人）。選手ページのルートは `/players/[...slug]` 1本（`[id]` と `[id, season]`）。2階層 `[playerId]/[season]` にすると過去季が無い間 `generateStaticParams` が空になり、Next 16 は「未定義」と扱ってビルドを止める。kokkai-data は 346MB・7,851ファイルで稼働中。Cloudflare Pages の上限は **1デプロイ 20,000ファイル・1ファイル 25MiB**。過去シーズンが増えるごとに `/players/[id]/[season]` が約5,200ファイル増えるので、**過去季3つ目（2029年春・4シーズン分）で上限に当たる**（6,451＋5,200×3≒22,000）。そのときの手は (a) 過去季ページをローテ選手（GP≥MIN_GP）に絞る (b) 最古の季を落とす。セグメント `.txt` の出力を止める設定は Next 16.2.6 には無い（`config-shared.js` に `clientSegmentCache` のキー無し・同梱ドキュメントにも無し）。サイズ側はショットチャートを点ごとの `<circle>` から成功/失敗2本の `<path>` に変えて圧縮（下記）。

**接続結果（2026-09-01）**: https://nba-data.pages.dev/ で稼働。`_redirects` の旧URL7本が301、新パス・ブラケット木・GA4タグ・可視テキスト（選手/チーム/PO）が Vercel 版と一致。push → 自動ビルドも同日確認（`aa291b7`）。注意: 接続直後に「This project is disconnected from your Git account」が出て再接続が必要だった（GitHub 側の Cloudflare Pages アプリのリポジトリ権限）。切断中の push は再接続しても拾われないので、空コミット push で起動した。残: Vercel 削除。独自ドメインは後付け可（コードにホスト名なし。付けたら kokkai-data の `site.ts` 型を移植して canonical を固定）。

**やらないこと**: Workers＋OpenNext（SSR維持）。Workers にはファイルシステムが無く `src/lib/data/*.ts` の `fs.readFileSync` が全て動かないため、CSV のバンドル化か R2 移行が要り、静的エクスポートより大きい。

**繰越の模擬ビルドで出た静的エクスポートの落とし穴（2026-09-02 記録・同日修正）**: rollover 後の状態（PO 依存ファイル削除・season.txt=2026-27・data/2025-26/ あり）と、その翌日の日次取得後（RS CSV がヘッダーのみ）の2状態をコピーで `npm run build` した。どちらも 2026-09-01 の rollover 検証（SSR 時代）では出なかった。
1. `/games/[gameId]` は boxscore（PO のみ取得）から params を作るため RS 期間中は空になり、`output: export` は空の generateStaticParams を「未定義」扱いでビルド失敗にする（`next/dist/build/index.js` の `prerenderedRoutes.length > 0` 判定）。→ boxscore を現季＋過去季から探す（`findBoxScore` / `boxScoreGameIds`、gameId はシーズン跨ぎで一意）。副産物として過去季のボックススコアが残る
2. `/og/players/[...slug]` は静的出力で `og/players/<id>`（ファイル）と `og/players/<id>/<season>`（ディレクトリ）が同名衝突し EISDIR。過去季が存在する限り毎回起きる。→ 過去季の OG 画像 URL を `/og/players/<season>/<id>` に逆順化（`.html` が付く page と違い Route Handler は拡張子なしで書き出されるため）
- 翌日取得後の状態: RS 各ページは「2026-27 Regular Season」見出しのまま空表になる（「開幕前」表示があるのは PO だけ）。`/players/<id>`（現季）は params が空になり 404、`/players/<id>/2025-26` は残る。**繰越を開幕直前にすれば空表の期間は最小になる**

### 12-12. チーム色のコントラスト根本対策（2026-09-01 記録・同日実装 `19bc44d`。ふくたろう指摘）

**現象**: 暗背景（`html.dark`・`--background: oklch(0.145 0 0)`≒#0a0a0a、カードは 0.205）に対して、チームのプライマリ色をそのまま置くと PHX・DEN・MIN 等が沈んで見えない。2026-09-01 に文字色→ドットへ変えた（`b80c83a`）が、ドット自体が同じ色なので根本解決になっていない。

**実測（`src/lib/constants/teams.ts` の30チーム × 背景 #0a0a0a、WCAG コントラスト比。非テキストマークの自前基準は 3:1・feel-viz README §アクセシビリティ）**: **16/30 が 3:1 未満**。

| 区分 | チーム（primary 対背景） | secondary で救えるか |
|---|---|---|
| 1.0〜1.5（ほぼ見えない） | BKN 1.06・CHA 1.23・PHX 1.23・DEN 1.25・MIN 1.25・NOP 1.25・UTA 1.41・WAS 1.41・IND 1.46 | UTA 以外は可（DEN 12.5・PHX 5.7・IND 11.6・MIN 3.0・NOP 3.4・WAS 4.2・CHA 3.8・BKN 19.8） |
| 1.5〜3.0 | MIL 1.81・LAL 1.87・CLE 1.95・SAC 2.01・GSW 2.07・MIA 2.24・DAL 2.47 | CLE・DAL 以外は可 |
| 3.0 以上（現状可） | DET/LAC 3.37・NYK/PHI 3.56・CHI/HOU/TOR 3.56・BOS 3.61・ORL 4.15・OKC 4.29・MEM 4.36・ATL/POR 4.57・SAS 12.4 | — |

**方針（1関数で全28箇所を直す）**: `getTeamColor()` は28箇所から呼ばれている（ドット・バッジ枠・帯・ヒートマップ等）ので、呼び出し側を触らず**関数の中で「暗背景で見える色」に解決する**。規則は決定論的で、色の選定に人の判断を残さない:
1. primary が背景に対して 3:1 以上 → そのまま
2. 満たさなければ secondary が 3:1 以上 → secondary（DEN=黄・PHX=橙・LAL=金 など、チームの「もう一つの色」として自然）
3. 両方満たさない（UTA・CLE・DAL）→ primary を白と混ぜて 3:1 に達する最小の明度まで持ち上げる（色相は保つ）
- 実装は `src/lib/constants/teams.ts` に `contrastRatio`・`onDarkColor` を置き、`getTeamColor` の戻り値をビルド時に解決（静的サイトなので実行時コストなし）。テスト: 30チーム全てが 3:1 以上になること・現状 3:1 以上のチームは色が変わらないこと
- 背景色はライト/ダークで変わるが、サイトは `html.dark` 固定なので暗背景だけを対象にする（ライト対応を足すときは同じ関数に背景引数を足す）
- **やらないこと**: チーム色定数の手修正（30件を目で選ぶと基準がぶれる）、ドット外周の白リング（3:1 未満の色を白で囲っても中身の同定はできない。sumo/feel-viz の「自分マーカーは色＋白リング」は識別用で、色の判別とは別問題）
- 影響: 順位表・リーダーの所属バッジ枠・ボール支配の帯・ブラケット・PO節など、チーム色を使う全面
- **実装結果**: `src/lib/constants/teams.ts` に `contrastRatio`・`onDarkColor` を追加し `getTeamColor` の戻り値をモジュール読み込み時に解決。テスト5件（`teams.test.ts`）。変わった16チーム: secondary 採用 = BKN白・CHA青緑・DEN黄・GSW黄・IND黄・LAL金・MIA橙・MIL生成り・MIN青・NOP赤・PHX橙・SAC灰・WAS赤、明度補正 = CLE `#a4406a`・DAL `#1a6498`・UTA `#406085`（いずれも 3.0〜3.3:1 の最小明度）
