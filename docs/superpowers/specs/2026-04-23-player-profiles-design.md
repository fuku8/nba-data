# 選手プロフィール機能 設計ドキュメント

作成日: 2026-04-23

---

## 概要

選手個人ページ（`/players/[playerId]`）に生年月日・身長・体重・NBAデビュー年などのパーソナルデータを追加表示する。

データソースは nba_api の `CommonPlayerInfo` エンドポイント。全選手分を一括取得すると約587リクエスト必要でレート制限リスクがあるため、分割取得スクリプトで累積保存し、取得済みデータはスキップして何日かに分けて収集できる設計にする。

---

## 1. データソース検証結果

### `CommonPlayerInfo` エンドポイント（nba_api）

1選手ごとに個別リクエスト。取得可能な全フィールド（`get_data_frames()[0]` のフレーム0）:

| フィールド | 内容 | 例 |
|---|---|---|
| `PERSON_ID` | 選手ID | `1628384` |
| `FIRST_NAME` | 名 | `OG` |
| `LAST_NAME` | 姓 | `Anunoby` |
| `DISPLAY_FIRST_LAST` | フルネーム | `OG Anunoby` |
| `BIRTHDATE` | 生年月日（ISO形式） | `1997-07-17T00:00:00` |
| `HEIGHT` | 身長（フィート-インチ） | `6-7` |
| `WEIGHT` | 体重（ポンド） | `240` |
| `POSITION` | ポジション | `Forward-Guard` |
| `JERSEY` | 背番号 | `8` |
| `COUNTRY` | 出身国 | `United Kingdom` |
| `SCHOOL` | 出身大学 | `Indiana` |
| `FROM_YEAR` | NBAデビュー年 | `2017` |
| `TO_YEAR` | 最終シーズン年 | `2025` |
| `SEASON_EXP` | NBA通算シーズン数 | `8` |
| `DRAFT_YEAR` | ドラフト年 | `2017` |
| `DRAFT_ROUND` | ドラフトラウンド | `1` |
| `DRAFT_NUMBER` | ドラフト順位 | `23` |
| `GREATEST_75_FLAG` | NBA75周年メンバーか | `N` |

> 参照: `nba_api.stats.endpoints.commonplayerinfo.CommonPlayerInfo(player_id=...)`

---

## 2. 取得スクリプト

### `scripts/fetch-player-profiles.py`（新規）

#### 動作仕様

- `data/player_profiles.csv` が存在する場合、取得済み `PLAYER_ID` を読み込みスキップ
- `data/player_per_game.csv` から現シーズンの全選手IDリストを取得
- 未取得の選手のみ `CommonPlayerInfo` でリクエスト
- 1リクエストごとに `sleep(1)` で待機（レート制限対策）
- デフォルト1回あたり 50件 取得（`--batch N` オプションで変更可）
- 取得結果を `player_profiles.csv` に追記（上書きではなく追記）
- 実行のたびに進捗を表示：`320/587 取得済み, 今回 50 件取得, 残り 217 件`

#### コマンド例

```bash
# 50件ずつ取得（デフォルト）
python3 scripts/fetch-player-profiles.py

# 100件ずつ取得
python3 scripts/fetch-player-profiles.py --batch 100

# 進捗確認のみ（取得しない）
python3 scripts/fetch-player-profiles.py --dry-run
```

#### 保存先 CSV スキーマ

`data/player_profiles.csv`

```
PLAYER_ID, PLAYER_NAME, BIRTHDATE, HEIGHT, WEIGHT, POSITION,
JERSEY, COUNTRY, SCHOOL, FROM_YEAR, DRAFT_YEAR, DRAFT_ROUND, DRAFT_NUMBER
```

| 列名 | 型 | 備考 |
|---|---|---|
| `PLAYER_ID` | int | プライマリキー相当 |
| `PLAYER_NAME` | str | `DISPLAY_FIRST_LAST` の値 |
| `BIRTHDATE` | str | ISO形式 `YYYY-MM-DDTHH:MM:SS` → 表示時に `YYYY-MM-DD` に切り出す |
| `HEIGHT` | str | `6-7` 形式のまま保存 |
| `WEIGHT` | str | ポンド数値（文字列） |
| `POSITION` | str | `Forward-Guard` 等 |
| `JERSEY` | str | 背番号（文字列） |
| `COUNTRY` | str | 出身国 |
| `SCHOOL` | str | 出身大学（なければ空文字） |
| `FROM_YEAR` | int | NBAデビュー年 |
| `DRAFT_YEAR` | str | ドラフト年（未ドラフトは空） |
| `DRAFT_ROUND` | str | ドラフトラウンド（未ドラフトは空） |
| `DRAFT_NUMBER` | str | ドラフト順位（未ドラフトは空） |

#### 更新頻度

- 原則 **1回取得したら再取得不要**（身長・体重・生年月日は変わらない）
- ロスター変更（新人加入・トレード等）が発生した場合のみ手動実行
- GitHub Actions の定期実行には組み込まない

---

## 3. TypeScript 型定義

`src/lib/types.ts` に追加:

```typescript
export interface PlayerProfile {
  playerId: number;
  playerName: string;
  birthdate: string;      // "1997-07-17" (YYYY-MM-DD)
  height: string;         // "6-7"
  weight: string;         // "240"
  position: string;       // "Forward-Guard"
  jersey: string;         // "8"
  country: string;
  school: string;
  fromYear: number;       // NBAデビュー年
  draftYear: string;
  draftRound: string;
  draftNumber: string;
}
```

---

## 4. データローダー

`src/lib/data/players.ts` に追加:

```typescript
export function getPlayerProfile(playerId: number): PlayerProfile | undefined
export function getAllPlayerProfiles(): PlayerProfile[]
```

- `data/player_profiles.csv` を読み込み `PlayerProfile[]` に変換
- `birthdate` は `BIRTHDATE` フィールドの `T` 以降を切り捨てて `YYYY-MM-DD` 形式に正規化

---

## 5. 選手ページ表示

### 対象ファイル

`src/app/players/[playerId]/page.tsx`

### 表示項目・位置

ヘッダー部（名前・チーム名の下）に以下を追加:

```
#11 · PG · 6-2 / 190 lbs · 生: 1996-08-31 · NBA: 2018年〜
```

プロフィールデータが存在しない選手（取得未完了）は該当フィールドを非表示にし、他の表示に影響を与えない。

### 表示する項目

| 項目 | ソース列 | 表示形式 |
|---|---|---|
| 背番号 | `JERSEY` | `#11` |
| ポジション | `POSITION` | `PG`（`-` 区切りの先頭部分を短縮） |
| 身長 | `HEIGHT` | `201 cm`（フィート-インチ → cm 変換） |
| 体重 | `WEIGHT` | `86 kg`（ポンド → kg 変換） |
| 生年月日 | `BIRTHDATE` | `1996-08-31` |
| NBAデビュー年 | `FROM_YEAR` | `2018年〜` |

> ドラフト情報・出身国・出身大学は今フェーズではスコープ外。必要であれば後フェーズで追加。

---

## 6. ディレクトリ変更まとめ

```
nba-data/
├── data/
│   └── player_profiles.csv          # 新規（累積保存）
├── scripts/
│   └── fetch-player-profiles.py     # 新規
└── src/
    ├── lib/
    │   ├── types.ts                  # PlayerProfile 型追加
    │   └── data/
    │       └── players.ts            # getPlayerProfile() 追加
    └── app/
        └── players/
            └── [playerId]/
                └── page.tsx          # プロフィール表示追加
```

---

## 7. 実装フェーズ

### Phase 1: 取得スクリプト（完了 2026-04-23）
- [x] `scripts/fetch-player-profiles.py` 作成
- [x] `--batch` / `--dry-run` オプション対応
- [x] 初回実行・`data/player_profiles.csv` 生成確認（582件成功・0件失敗）

### Phase 2: フロント実装（完了 2026-04-23）
- [x] `src/lib/types.ts` に `PlayerProfile` 型追加
- [x] `src/lib/data/players.ts` に `getPlayerProfile()` 追加
- [x] `src/app/players/[playerId]/page.tsx` にプロフィール表示追加
- [x] プロフィールデータなし選手でのフォールバック確認
- [x] 身長・体重を cm / kg に変換して表示
- [x] `npm run typecheck` クリア

---

## 8. 留意事項

- `player_profiles.csv` は git 管理に含める（data/ 以下の他 CSV と同様）
- 未ドラフト選手（Undrafted）の場合 `DRAFT_YEAR` / `DRAFT_ROUND` / `DRAFT_NUMBER` は空文字になる
- `HEIGHT` / `WEIGHT` は nba_api から文字列で返るため、CSV でも文字列として保持する
- プレーオフ選手（`po_player_per_game.csv` にのみ存在する選手）も対象に含める場合は、取得対象IDリストに `po_player_per_game.csv` の PLAYER_ID も含める
