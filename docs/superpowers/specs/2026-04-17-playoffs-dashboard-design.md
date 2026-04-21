# NBAプレーオフ ダッシュボード 設計ドキュメント

作成日: 2026-04-17
最終更新: 2026-04-21（verify結果を反映・データソース確定）

---

## 概要

既存の `nba-data` アプリに NBA プレーオフ専用セクション（`/playoffs/*`）を追加する。
データソース・技術スタック・運用フローは既存と完全に同じ。追加のインフラは不要。

---

## 1. 検証フェーズ（完了）

> 2026-04-21 verify完了。URLパターンが `/leagues/` ではなく `/playoffs/` であることを確認。

### 検証結果

| URL | 結果 | 備考 |
|---|---|---|
| `/playoffs/NBA_2026_standings.html` | ✓ 取得可 | 選手per gameスタッツ（179選手）が含まれる |
| `/playoffs/NBA_2026_games.html` | ✓ 取得可 | 試合日程・結果 |
| `/playoffs/NBA_2026_leaders.html` | ✗ 取得不可 | 不要（per gameから算出で代替） |
| `/playoffs/NBA_2026_totals.html` | ✓ 取得可 | 選手totalsスタッツ |
| `/playoffs/NBA_2026_per_game.html` | ✓ 取得可 | 選手per gameスタッツ |
| `/playoffs/NBA_2026_advanced.html` | — | 未確認・データなし可能性あり → 今期はスコープ外 |

### 検証スクリプト

`scripts/verify-playoff-data.py`（URLを `/playoffs/NBA_2026_*.html` パターンに修正済み）

---

## 2. データソース

### 新規追加CSVファイル（`data/` に追加）

| ファイル名 | 取得元 URL | 内容 | 備考 |
|---|---|---|---|
| `po_series.csv` | `games.html` の集計で生成 | シリーズ勝敗・ラウンド・対戦カード | ブラケットページではなくgames.htmlの試合結果から対戦カード・勝敗を算出 |
| `po_team_stats.csv` | `/playoffs/NBA_2026_standings.html` | チームPOスタッツ | standings.htmlに含まれるチームスタッツテーブルを抽出 |
| `po_player_per_game.csv` | `/playoffs/NBA_2026_per_game.html` | 選手PO平均スタッツ | |
| `po_player_totals.csv` | `/playoffs/NBA_2026_totals.html` | 選手PO合計スタッツ | |

> **スコープ外（今期）:** `po_player_advanced.csv` — advancedスタッツページが取得不可のため除外

### 既存CSVの活用（追加不要）

| ファイル名 | 用途 |
|---|---|
| `games.csv` | PO試合結果（4〜6月分は既に含まれる） |
| `player_per_game.csv` | レギュラーシーズンとの比較用 |
| `player_advanced.csv` | レギュラーシーズンとの比較用 |

---

## 3. スクリプト変更

### `scripts/fetch-bref-data.py` への追記

既存の `main()` 関数末尾に playoff フェッチ処理を追加する。
既存コードには一切触れない。

```
追加処理フロー:
1. /playoffs/NBA_2026_games.html → po_series.csv（試合結果から対戦カード・シリーズ勝敗を集計して生成）
2. sleep(5)
3. /playoffs/NBA_2026_standings.html → po_team_stats.csv（チームスタッツテーブルを抽出）
4. sleep(5)
5. /playoffs/NBA_2026_per_game.html → po_player_per_game.csv
6. sleep(5)
7. /playoffs/NBA_2026_totals.html → po_player_totals.csv
```

プレーオフデータが取得できない場合はスキップして続行（エラーで終了しない）。

---

## 4. ページ構成

### 追加ルート

```
src/app/
└── playoffs/
    ├── page.tsx                    # トップ（ブラケット + 直近試合 + リーダー）
    ├── layout.tsx                  # POセクション共通レイアウト
    ├── teams/
    │   └── [teamId]/
    │       └── page.tsx            # チーム別POスタッツ + ロスター
    ├── games/
    │   └── page.tsx                # 試合結果（日付移動）
    ├── players/
    │   └── page.tsx                # 選手スタッツ一覧（ソート）
    ├── leaders/
    │   └── page.tsx                # スタッツリーダーボード
    ├── search/
    │   └── page.tsx                # 選手名検索
    └── compare/
        └── page.tsx                # 選手比較（チャート）
```

### 各ページ詳細

#### `/playoffs`（トップ）
- **ブラケット**: ビジュアルブラケット（1回戦〜ファイナル）
- **シリーズカード**: ラウンド別にカード並列表示（勝敗・次戦日時）
- **直近試合**: 最新5試合のスコア（`games.csv` からPO期間でフィルタ）
- **スタッツリーダー**: PTS/REB/AST 上位3名をカード表示

#### `/playoffs/teams/[teamId]`
- チームのPOシリーズ成績（何回戦まで進んだか）
- チームPOスタッツ（`po_team_per_game.csv`）
- ロスター + 選手全員のPOスタッツ（`po_player_per_game.csv` でフィルタ）
- RSとの比較列を並べて表示（PTS/REB/AST/FG%）

#### `/playoffs/games`
- PO期間の試合結果（`games.csv` から4月以降でフィルタ）
- 日付移動（前日/翌日ボタン）
- 初期表示: 最新の試合がある日付

#### `/playoffs/players`
- `po_player_per_game.csv` のスタッツ一覧
- カラムクリックでソート
- タブ切替: 基本スタッツ / アドバンスドスタッツ
- RS比較列: RSのPTS/REB/ASTを横に並べて表示

#### `/playoffs/leaders`
- POスタッツカテゴリ別リーダー（PTS/REB/AST/STL/BLK/FG%/3P%/PER/WS/BPM）
- 各カテゴリ上位10名をバーチャートで表示

#### `/playoffs/search`
- 選手名でインクリメンタルサーチ
- 結果カード: POスタッツ + RS比較

#### `/playoffs/compare`
- 選手名検索で最大4名選択
- レーダーチャート（PTS/REB/AST/STL/BLK 正規化）
- PO/RS並列比較テーブル

---

## 5. ナビゲーション変更

`src/components/layout/navigation.tsx` にプレーオフセクションを追加。

```
既存:
  ホーム | 順位表 | チーム | 選手 | 試合 | リーダーズ | 比較 | 検索

変更後:
  レギュラーシーズン: ホーム | 順位表 | チーム | 選手 | 試合 | リーダーズ | 比較 | 検索
  プレーオフ:         POトップ | チーム | 選手 | 試合 | リーダーズ | 比較 | 検索
```

セクション切替はタブ or セパレーターで視覚的に区別する。

---

## 6. 型定義追加

`src/lib/types.ts` に以下を追加:

```typescript
// プレーオフ シリーズ
export interface PlayoffSeries {
  round: number;           // 1=1回戦, 2=2回戦, 3=カンファレンス決勝, 4=ファイナル
  roundName: string;       // "First Round" | "Semifinals" | "Conference Finals" | "Finals"
  conference: "East" | "West" | "Finals";
  topTeam: string;         // 上位シードチーム名
  bottomTeam: string;      // 下位シードチーム名
  topTeamWins: number;
  bottomTeamWins: number;
  winner: string | null;   // null = 進行中
  seriesStatus: string;    // "4-2" | "In Progress" など
}

// プレーオフ 選手スタッツ（RSと同じ形状）
export type PlayoffPlayerPerGame = PlayerPerGame;
export type PlayoffPlayerTotals = PlayerTotals;
// PlayoffPlayerAdvanced は今期スコープ外（データなし）

// プレーオフ チームスタッツ
export interface PlayoffTeamStats {
  team: string;
  gp: number;
  wins: number;
  losses: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
}
```

---

## 7. データローダー追加

`src/lib/data/` に追加:

```
src/lib/data/
├── playoffs.ts    # po_*.csv の読み込み・集計関数
└── (既存ファイルは変更なし)
```

`playoffs.ts` が提供する関数:
- `getPlayoffSeries()` → `PlayoffSeries[]`（po_series.csvから）
- `getPlayoffPlayerPerGame()` → `PlayoffPlayerPerGame[]`
- `getPlayoffPlayerTotals()` → `PlayoffPlayerTotals[]`
- `getPlayoffTeamStats()` → `PlayoffTeamStats[]`
- `getPlayoffGames()` → po_series.csvの試合結果から返す
// getPlayoffPlayerAdvanced は今期スコープ外

---

## 8. ディレクトリ追加まとめ

```
nba-data/
├── data/
│   ├── (既存CSVはそのまま)
│   ├── po_series.csv              # 新規（games.htmlの集計から生成）
│   ├── po_team_stats.csv          # 新規（standings.htmlから抽出）
│   ├── po_player_per_game.csv     # 新規
│   └── po_player_totals.csv       # 新規
├── scripts/
│   ├── fetch-bref-data.py         # playoff フェッチを追記
│   └── verify-playoff-data.py     # 検証用（完了済み）
└── src/
    ├── app/
    │   └── playoffs/              # 新規（7ページ）
    ├── lib/
    │   ├── data/
    │   │   └── playoffs.ts        # 新規
    │   └── types.ts               # PlayoffSeries 等を追記
    └── components/
        └── layout/
            └── navigation.tsx     # POセクション追加
```

---

## 9. 実装フェーズ

### Phase 0: 検証（完了 2026-04-21）
- [x] `verify-playoff-data.py` 作成・実行
- [x] URLパターンを `/playoffs/NBA_2026_*.html` に修正
- [x] 各URL の取得可否・列構造を確認
- [x] データソース確定（advancedはスコープ外、po_series.csvはgames.htmlから集計）

### Phase 1: データ層（完了 2026-04-21）
- [x] `fetch-bref-data.py` にPOフェッチ追記
- [x] GitHub Actions で手動実行 → po_*.csv 生成確認（po_series / po_player_per_game / po_player_totals / po_team_stats）
- [x] `src/lib/types.ts` に型追加
- [x] `src/lib/data/playoffs.ts` 作成

### Phase 2: ページ実装（完了 2026-04-21）
- [x] ナビゲーション更新（POセクション追加）
- [x] `/playoffs` トップ（シリーズカード + 直近試合 + リーダー）
- [x] `/playoffs/games`（試合結果・日付移動）
- [x] `/playoffs/players`（一覧・ソート）
- [x] `/playoffs/teams/[teamId]`（チームスタッツ + ロスター）
- [x] `/playoffs/leaders`（カテゴリ別リーダー）
- [x] `/playoffs/search`（選手検索）
- [x] `/playoffs/compare`（選手比較チャート）

### Phase 3: 仕上げ（完了 2026-04-21）
- [x] RS比較表示の調整（現状の実装で確定）
- [x] プレーオフ進行中の場合の表示（未確定シリーズのハンドリング）
- [x] レスポンシブ対応確認
- [x] デプロイ・動作確認

---

## 11. 既存ページへの統合（追加要件）

### 11-1. トップページ（`/`）のプレーオフ期間中切り替え

`po_player_per_game.csv` にデータが存在する場合、トップページはプレーオフ専用ビューに切り替える。

**プレーオフビューの内容**
- ヘッダー: "NBA 2025-26 Playoffs" バナー（紫金バッジ付き）
- シリーズカード（`po_series.csv` から）: ラウンド別に並列表示
- プレーオフ スタッツリーダー（PTS/REB/AST 上位5名）
- "/playoffs" リンク（詳細はプレーオフセクションへ）

**フォールバック**: データなし → 現在の RS ダッシュボードをそのまま表示

---

### 11-2. チームページ（`/teams/[teamId]`）RS vs PO スタッツ比較

チームスタッツセクションを RS のみから **RS / PO 比較表** に拡張する。

**表示方式**
- `po_team_per_game.csv` にデータがある場合: RS列・PO列を並べた比較テーブル
- `po_team_per_game.csv` が空の場合: 既存の RS 単独表示を維持
- 比較する項目: PTS / REB / AST / STL / BLK / TOV / FG% / 3P% / FT%

**ラベル**: 見出しに "レギュラーシーズン" / "プレーオフ" のバッジを付けて区別する

---

### 11-3. 選手ページ（`/players/[playerId]`）RS vs PO スタッツ比較

**選手一覧からの遷移**
- チームページ・選手ページのロスター表で選手名をクリック → `/players/[playerId]` へ遷移（既存の実装で対応済み）

**選手個人ページの PO 比較セクション**
- `po_player_per_game.csv` にその選手のデータがある場合、RS との比較カードを追加表示
- 比較方式: RS 行・PO 行を並べた比較テーブル（GP / PTS / REB / AST / STL / BLK / FG% / 3P%）
- アドバンスドスタッツも同様: `po_player_advanced.csv` が存在すれば PER / WS / BPM を RS と比較
- データなし → セクション自体を非表示

---

## 10. 留意事項

- **プレーオフ未開始時**: po_*.csv が存在しない期間は「プレーオフ開始前」の表示にフォールバック
- **進行中シリーズ**: `winner: null` の場合は「進行中」バッジを表示
- **games.csv のPOフィルタ**: 4月中旬以降 + プレーイン対象チーム（7〜10位）を除いてPOのみに絞る方法を検討（BRのゲームページにプレーオフフラグがあるか検証時に確認）
- **シリーズ別スタッツ**: 現時点でBRの series 別 URL（`/playoffs/series/`）の構造は不明。Phase 0 の検証で確認する
