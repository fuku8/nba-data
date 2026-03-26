"""試合データのみを取得する軽量スクリプト（requests ベース）"""
import pandas as pd
import requests
import os
import time

SEASON_YEAR = "2026"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def parse_games_table(html: str) -> pd.DataFrame | None:
    """HTMLからゲームテーブルをパースする"""
    tables = pd.read_html(html)
    if not tables:
        return None
    df = tables[0]

    if "Date" in df.columns:
        df = df[df["Date"] != "Date"]

    col_map = {}
    for c in df.columns:
        if "Visitor" in str(c) or c == "Visitor/Neutral":
            col_map[c] = "Visitor"
        elif "Home" in str(c) or c == "Home/Neutral":
            col_map[c] = "Home"
    df = df.rename(columns=col_map)

    pts_indices = [i for i, c in enumerate(df.columns) if str(c).startswith("PTS")]
    if len(pts_indices) >= 2:
        new_cols = list(df.columns)
        new_cols[pts_indices[0]] = "VisitorPTS"
        new_cols[pts_indices[1]] = "HomePTS"
        df.columns = new_cols

    keep = [c for c in ["Date", "Visitor", "VisitorPTS", "Home", "HomePTS"] if c in df.columns]
    df = df[keep]
    df = df.dropna(subset=["Date", "Visitor", "Home"])

    if "VisitorPTS" in df.columns:
        df["VisitorPTS"] = pd.to_numeric(df["VisitorPTS"], errors="coerce")
    if "HomePTS" in df.columns:
        df["HomePTS"] = pd.to_numeric(df["HomePTS"], errors="coerce")
    df = df.dropna(subset=["VisitorPTS", "HomePTS"])
    return df

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    all_games = []
    months = ["october", "november", "december", "january", "february", "march", "april", "may", "june"]

    for month in months:
        url = f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}_games-{month}.html"
        print(f"Fetching: {month}...")
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code == 404:
                print(f"  - {month}: no data (season not reached)")
                continue
            if resp.status_code == 403:
                print(f"  ! {month}: 403 - waiting 30s and retrying...")
                time.sleep(30)
                resp = requests.get(url, headers=HEADERS, timeout=20)
                if resp.status_code != 200:
                    print(f"  ✗ {month}: retry failed ({resp.status_code})")
                    continue
            resp.raise_for_status()

            df = parse_games_table(resp.text)
            if df is not None and len(df) > 0:
                print(f"  ✓ {month}: {len(df)} games")
                all_games.append(df)
            else:
                print(f"  - {month}: no completed games")
        except Exception as e:
            print(f"  ✗ {month}: {e}")
            continue

        time.sleep(5)

    if all_games:
        result = pd.concat(all_games, ignore_index=True)
        result.to_csv(os.path.join(DATA_DIR, "games.csv"), index=False)
        print(f"\n✓ games.csv saved: {len(result)} total games")
    else:
        print("\n✗ No game data fetched")

if __name__ == "__main__":
    main()
