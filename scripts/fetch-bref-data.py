"""
Basketball Referenceから2025-26シーズンのNBAデータを取得してCSVファイルに保存するスクリプト
ローカルで実行し、git push で Vercel にデプロイする運用を想定
"""
import pandas as pd
import os
import time
from datetime import datetime, timezone, timedelta

SEASON_YEAR = "2026"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
SLEEP_SEC = 5

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Basketball Reference のチーム略称 → 標準略称マッピング
TEAM_ABBR_MAP = {
    "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
    "Los Angeles Clippers": "LAC", "Los Angeles Lakers": "LAL", "Memphis Grizzlies": "MEM",
    "Miami Heat": "MIA", "Milwaukee Bucks": "MIL", "Minnesota Timberwolves": "MIN",
    "New Orleans Pelicans": "NOP", "New York Knicks": "NYK", "Oklahoma City Thunder": "OKC",
    "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX",
    "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC", "San Antonio Spurs": "SAS",
    "Toronto Raptors": "TOR", "Utah Jazz": "UTA", "Washington Wizards": "WAS",
}

# BR略称 → 標準略称
BR_ABBR_MAP = {
    "ATL": "ATL", "BOS": "BOS", "BRK": "BKN", "CHO": "CHA", "CHI": "CHI",
    "CLE": "CLE", "DAL": "DAL", "DEN": "DEN", "DET": "DET", "GSW": "GSW",
    "HOU": "HOU", "IND": "IND", "LAC": "LAC", "LAL": "LAL", "MEM": "MEM",
    "MIA": "MIA", "MIL": "MIL", "MIN": "MIN", "NOP": "NOP", "NYK": "NYK",
    "OKC": "OKC", "ORL": "ORL", "PHI": "PHI", "PHO": "PHX", "POR": "POR",
    "SAC": "SAC", "SAS": "SAS", "TOR": "TOR", "UTA": "UTA", "WAS": "WAS",
    # 念のため標準略称もそのまま通す
    "BKN": "BKN", "CHA": "CHA", "PHX": "PHX",
}


def normalize_team_abbr(abbr: str) -> str:
    """BR略称を標準略称に変換"""
    return BR_ABBR_MAP.get(abbr, abbr)


def clean_team_name(name: str) -> str:
    """チーム名のアスタリスク等を除去"""
    return name.replace("*", "").strip()


def fetch_season_page_tables():
    """メインシーズンページから全テーブルを取得"""
    url = f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}.html"
    print(f"Fetching: {url}")
    tables = pd.read_html(url, storage_options={"User-Agent": HEADERS["User-Agent"]})
    return tables


def extract_standings(tables) -> bool:
    """順位表（Eastern / Western）を抽出"""
    try:
        east_df = None
        west_df = None
        for table in tables:
            cols = list(table.columns)
            if "Eastern Conference" in cols:
                east_df = table.rename(columns={"Eastern Conference": "Team"})
            elif "Western Conference" in cols:
                west_df = table.rename(columns={"Western Conference": "Team"})

        if east_df is None or west_df is None:
            print("✗ 順位表テーブルが見つかりません")
            return False

        east_df["Conference"] = "East"
        west_df["Conference"] = "West"

        standings = pd.concat([east_df, west_df], ignore_index=True)
        standings["Team"] = standings["Team"].apply(clean_team_name)

        # 不要行除去
        standings = standings[~standings["Team"].str.contains("Division", na=False)]
        standings = standings.dropna(subset=["W"])

        # 数値変換
        for col in ["W", "L"]:
            if col in standings.columns:
                standings[col] = pd.to_numeric(standings[col], errors="coerce")
        if "W/L%" in standings.columns:
            standings["W/L%"] = pd.to_numeric(standings["W/L%"], errors="coerce")

        standings.to_csv(os.path.join(DATA_DIR, "standings.csv"), index=False)
        print(f"  ✓ standings.csv: {len(standings)} チーム")
        return True
    except Exception as e:
        print(f"  ✗ standings エラー: {e}")
        return False


def extract_team_stats(tables, stat_type: str, filename: str) -> bool:
    """チームスタッツテーブルを探して保存"""
    try:
        target_df = None

        # Advanced テーブルの識別
        if stat_type == "advanced":
            for table in tables:
                if isinstance(table.columns, pd.MultiIndex):
                    flat_cols = [c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0] for c in table.columns]
                    if "ORtg" in flat_cols or "NRtg" in flat_cols:
                        table.columns = flat_cols
                        target_df = table
                        break
                elif "ORtg" in table.columns:
                    target_df = table
                    break
        elif stat_type == "per_game":
            for table in tables:
                cols = list(table.columns) if not isinstance(table.columns, pd.MultiIndex) else []
                if "PTS" in cols and "Team" in cols and "ORtg" not in cols:
                    # opponent テーブルではない（Teamカラムがある通常のPer Gameテーブル）
                    target_df = table
                    break
        elif stat_type == "opponent":
            # Opponentテーブルは通常Per Gameテーブルの後にある
            found_per_game = False
            for table in tables:
                cols = list(table.columns) if not isinstance(table.columns, pd.MultiIndex) else []
                if "PTS" in cols and "Team" in cols and "ORtg" not in cols:
                    if found_per_game:
                        target_df = table
                        break
                    found_per_game = True

        if target_df is None:
            print(f"  ✗ {stat_type} テーブルが見つかりません")
            return False

        # マルチインデックス解消
        if isinstance(target_df.columns, pd.MultiIndex):
            target_df.columns = [
                c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0]
                for c in target_df.columns
            ]

        # 重複カラム名除去
        target_df = target_df.loc[:, ~target_df.columns.duplicated()]

        # Team カラムのクリーニング
        if "Team" in target_df.columns:
            target_df["Team"] = target_df["Team"].apply(clean_team_name)
            target_df = target_df[target_df["Team"] != "League Average"]
            target_df = target_df.dropna(subset=["Team"])

        # 数値変換（Seriesのみ対象）
        for col in target_df.columns:
            if col != "Team" and isinstance(target_df[col], pd.Series):
                target_df[col] = pd.to_numeric(target_df[col], errors="coerce")

        target_df.to_csv(os.path.join(DATA_DIR, filename), index=False)
        print(f"  ✓ {filename}: {len(target_df)} チーム")
        return True
    except Exception as e:
        print(f"  ✗ {stat_type} エラー: {e}")
        return False


def fetch_player_stats(page_suffix: str, filename: str) -> bool:
    """選手スタッツページを取得して保存"""
    try:
        url = f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}_{page_suffix}.html"
        print(f"Fetching: {url}")
        tables = pd.read_html(url, storage_options={"User-Agent": HEADERS["User-Agent"]})

        if not tables:
            print(f"  ✗ {page_suffix} テーブルが見つかりません")
            return False

        df = tables[0]

        # マルチインデックス解消
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0] for c in df.columns]

        # 重複カラム名除去
        df = df.loc[:, ~df.columns.duplicated()]

        # ヘッダー行除去
        if "Player" in df.columns:
            df = df[df["Player"] != "Player"]

        # Rk カラム除去
        if "Rk" in df.columns:
            df = df.drop(columns=["Rk"])

        # 選手名クリーニング
        if "Player" in df.columns:
            df = df.dropna(subset=["Player"])
            if isinstance(df["Player"], pd.Series):
                df["Player"] = df["Player"].str.replace(r"\*$", "", regex=True)

        # チーム略称の標準化
        if "Tm" in df.columns and isinstance(df["Tm"], pd.Series):
            df["Tm"] = df["Tm"].apply(normalize_team_abbr)

        # 数値変換（Seriesのみ対象）
        for col in df.columns:
            if col not in ("Player", "Tm", "Pos") and isinstance(df[col], pd.Series):
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df.to_csv(os.path.join(DATA_DIR, filename), index=False)
        print(f"  ✓ {filename}: {len(df)} 選手")
        return True
    except Exception as e:
        print(f"  ✗ {page_suffix} エラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    results = {}

    # 1. メインシーズンページからチームデータ取得
    print("\n=== チームデータ取得 ===")
    tables = fetch_season_page_tables()

    results["standings"] = extract_standings(tables)
    results["team_advanced"] = extract_team_stats(tables, "advanced", "team_advanced.csv")
    results["team_per_game"] = extract_team_stats(tables, "per_game", "team_per_game.csv")
    results["team_opponent"] = extract_team_stats(tables, "opponent", "team_opponent.csv")

    # 2. 選手データ取得（各ページ間に5秒待機）
    print("\n=== 選手データ取得 ===")

    player_pages = [
        ("per_game", "player_per_game.csv"),
        ("totals", "player_totals.csv"),
        ("advanced", "player_advanced.csv"),
    ]

    for page_suffix, filename in player_pages:
        print(f"\n{SLEEP_SEC}秒待機中...")
        time.sleep(SLEEP_SEC)
        results[filename] = fetch_player_stats(page_suffix, filename)

    # Shooting は取得失敗する場合があるので optional
    print(f"\n{SLEEP_SEC}秒待機中...")
    time.sleep(SLEEP_SEC)
    results["player_shooting"] = fetch_player_stats("shooting", "player_shooting.csv")

    # 3. 更新日時を記録
    jst = timezone(timedelta(hours=9))
    with open(os.path.join(DATA_DIR, "last_updated.txt"), "w") as f:
        f.write(datetime.now(jst).strftime("%Y-%m-%d %H:%M:%S"))

    # 結果サマリ
    print("\n=== 結果サマリ ===")
    for key, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"  {status} {key}")

    success_count = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\n完了: {success_count}/{total} 成功")


if __name__ == "__main__":
    main()
