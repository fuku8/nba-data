"""
Basketball Referenceから2025-26シーズンのNBAデータを取得してCSVファイルに保存するスクリプト
ローカルで実行し、git push で Vercel にデプロイする運用を想定
"""
import pandas as pd
import io
import urllib.request
import urllib.error
from bs4 import BeautifulSoup
import os
import time
from datetime import datetime

SEASON_YEAR = "2026"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
SLEEP_SEC = 5

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


def _fetch_html(url: str, retry: bool = True) -> str:
    """URLからHTMLを取得する（デフォルトUA使用）"""
    try:
        with urllib.request.urlopen(url, timeout=20) as response:
            return response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 403 and retry:
            print(f"  ! 403 - 30秒待機後リトライ...")
            time.sleep(30)
            return _fetch_html(url, retry=False)
        raise


def _fetch_tables(url: str):
    """URLからHTMLテーブル一覧とHTML文字列を返す"""
    html = _fetch_html(url)
    tables = pd.read_html(io.StringIO(html))
    return tables, html


def fetch_season_page_tables():
    """メインシーズンページから全テーブルを取得"""
    url = f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}.html"
    print(f"Fetching: {url}")
    tables, _ = _fetch_tables(url)
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

        # Unnamed / Rk カラム除去
        drop_cols = [c for c in target_df.columns if "Unnamed" in str(c) or c == "Rk"]
        if drop_cols:
            target_df = target_df.drop(columns=drop_cols)

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
        tables, html = _fetch_tables(url)

        if not tables:
            print(f"  ✗ {page_suffix} テーブルが見つかりません")
            return False

        df = tables[0]

        # デバッグ: カラム構造の確認
        print(f"  Raw columns ({type(df.columns).__name__}): {list(df.columns)[:10]}...")
        if len(df) > 0:
            print(f"  First row sample: {dict(list(df.iloc[0].items())[:5])}")

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

        # カラム名の統一（pandas が Tm を Team に変換する場合がある）
        if "Team" in df.columns and "Tm" not in df.columns:
            df = df.rename(columns={"Team": "Tm"})

        # Tm列が空の場合、BeautifulSoupでHTMLから直接チーム略称を抽出
        tm_col = "Tm" if "Tm" in df.columns else None
        if tm_col and (df[tm_col].isna().all() or (df[tm_col] == "").all()):
            print(f"  ! Tm列が空 - HTMLから直接抽出します")
            soup = BeautifulSoup(html, "html.parser")
            table = soup.find("table")
            if table:
                teams = []
                for row in table.find("tbody").find_all("tr"):
                    if row.get("class") and "thead" in row.get("class", []):
                        continue
                    td = row.find("td", {"data-stat": "team_id"})
                    if td:
                        a = td.find("a")
                        teams.append(a.text.strip() if a else td.text.strip())
                    else:
                        teams.append("")
                if len(teams) == len(df):
                    df[tm_col] = teams
                    print(f"  ✓ Tm列を{len([t for t in teams if t])}件復元")

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


MONTH_ORDER = ["october", "november", "december", "january", "february",
               "march", "april", "may", "june"]

MONTH_NAME_TO_NUM = {
    "Oct": 10, "Nov": 11, "Dec": 12, "Jan": 1, "Feb": 2,
    "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
}

MONTH_NUM_TO_NAME = {v: k for k, v in {
    "october": 10, "november": 11, "december": 12, "january": 1,
    "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
}.items()}


def _parse_bref_date(date_str: str) -> datetime:
    """Basketball Reference の日付文字列をパース (例: 'Tue, Oct 21, 2025')"""
    return datetime.strptime(date_str.strip(), "%a, %b %d, %Y")


def _get_last_game_date() -> datetime | None:
    """既存 games.csv から最終試合日を取得"""
    games_path = os.path.join(DATA_DIR, "games.csv")
    if not os.path.exists(games_path):
        return None
    try:
        df = pd.read_csv(games_path)
        if df.empty or "Date" not in df.columns:
            return None
        last_date_str = df["Date"].iloc[-1]
        return _parse_bref_date(last_date_str)
    except Exception:
        return None


def _parse_games_html(html: str) -> pd.DataFrame:
    """試合ページのHTMLをパースしてDataFrameを返す"""
    tables = pd.read_html(io.StringIO(html))
    if not tables:
        return pd.DataFrame()
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

    col_indices = [i for i, c in enumerate(df.columns) if str(c).startswith("PTS")]
    if len(col_indices) >= 2:
        new_cols = list(df.columns)
        new_cols[col_indices[0]] = "VisitorPTS"
        new_cols[col_indices[1]] = "HomePTS"
        df.columns = new_cols

    keep_cols = ["Date", "Visitor", "VisitorPTS", "Home", "HomePTS"]
    available = [c for c in keep_cols if c in df.columns]
    df = df[available]
    df = df.dropna(subset=["Date", "Visitor", "Home"])

    if "VisitorPTS" in df.columns:
        df["VisitorPTS"] = pd.to_numeric(df["VisitorPTS"], errors="coerce")
    if "HomePTS" in df.columns:
        df["HomePTS"] = pd.to_numeric(df["HomePTS"], errors="coerce")
    df = df.dropna(subset=["VisitorPTS", "HomePTS"])
    return df


def fetch_games() -> bool:
    """試合結果を差分取得して既存CSVにマージする"""
    try:
        last_date = _get_last_game_date()
        games_path = os.path.join(DATA_DIR, "games.csv")

        if last_date is None:
            # 初回: 全月取得
            months_to_fetch = MONTH_ORDER
            existing_df = pd.DataFrame()
            print("  初回取得: 全月を取得します")
        else:
            # 差分: 最終試合日の月以降のみ取得
            last_month_num = last_date.month
            months_to_fetch = []
            for m in MONTH_ORDER:
                m_num = {"october": 10, "november": 11, "december": 12,
                         "january": 1, "february": 2, "march": 3,
                         "april": 4, "may": 5, "june": 6}[m]
                # シーズンは10月開始なので、1-6月は翌年扱い
                m_order = m_num if m_num >= 10 else m_num + 12
                last_order = last_month_num if last_month_num >= 10 else last_month_num + 12
                if m_order >= last_order:
                    months_to_fetch.append(m)
            existing_df = pd.read_csv(games_path)
            print(f"  差分取得: {last_date.strftime('%Y-%m-%d')} 以降 ({', '.join(months_to_fetch)})")

        new_games = []
        for month in months_to_fetch:
            url = f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}_games-{month}.html"
            print(f"  Fetching games: {month}...")
            try:
                html = _fetch_html(url)
                df = _parse_games_html(html)
                if not df.empty:
                    new_games.append(df)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    continue
                print(f"    ✗ {month}: HTTP {e.code}")
                continue
            except Exception as e:
                print(f"    ✗ {month}: {e}")
                continue

            time.sleep(SLEEP_SEC + 3)

        if not new_games and existing_df.empty:
            print("  ✗ 試合データが取得できませんでした")
            return False

        if new_games:
            new_df = pd.concat(new_games, ignore_index=True)

            if last_date is not None and not existing_df.empty:
                # 新規データから最終日以前を除外して重複防止
                new_df = new_df[new_df["Date"].apply(
                    lambda d: _parse_bref_date(d) > last_date
                )]
                if new_df.empty:
                    print(f"  ✓ games.csv: 新しい試合なし（{len(existing_df)} 試合のまま）")
                    return True
                games_df = pd.concat([existing_df, new_df], ignore_index=True)
                print(f"  ✓ games.csv: {len(new_df)} 試合追加 → 合計 {len(games_df)} 試合")
            else:
                games_df = new_df
                print(f"  ✓ games.csv: {len(games_df)} 試合")

            games_df.to_csv(games_path, index=False)
        else:
            print(f"  ✓ games.csv: 新しい試合なし（{len(existing_df)} 試合のまま）")

        return True
    except Exception as e:
        print(f"  ✗ games エラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def _parse_playoff_games_html(html: str) -> pd.DataFrame:
    """プレーオフ試合ページのHTMLをパース"""
    tables = pd.read_html(io.StringIO(html))
    if not tables:
        return pd.DataFrame()

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

    col_indices = [i for i, c in enumerate(df.columns) if str(c).startswith("PTS")]
    if len(col_indices) >= 2:
        new_cols = list(df.columns)
        new_cols[col_indices[0]] = "VisitorPTS"
        new_cols[col_indices[1]] = "HomePTS"
        df.columns = new_cols

    keep_cols = ["Date", "Visitor", "VisitorPTS", "Home", "HomePTS"]
    available = [c for c in keep_cols if c in df.columns]
    df = df[available]
    df = df.dropna(subset=["Date", "Visitor", "Home"])
    if "VisitorPTS" in df.columns:
        df["VisitorPTS"] = pd.to_numeric(df["VisitorPTS"], errors="coerce")
    if "HomePTS" in df.columns:
        df["HomePTS"] = pd.to_numeric(df["HomePTS"], errors="coerce")
    return df.dropna(subset=["VisitorPTS", "HomePTS"])


def _compute_series_from_games(games_df: pd.DataFrame) -> pd.DataFrame:
    """プレーオフ試合データからシリーズ勝敗を集計してDataFrameを返す"""
    series_data = {}

    for _, row in games_df.iterrows():
        visitor = str(row.get("Visitor", "")).strip()
        home = str(row.get("Home", "")).strip()
        visitor_pts = row.get("VisitorPTS")
        home_pts = row.get("HomePTS")
        date = str(row.get("Date", "")).strip()

        if not visitor or not home:
            continue

        teams = sorted([visitor, home])
        key = f"{teams[0]}_{teams[1]}"

        if key not in series_data:
            series_data[key] = {
                "team1": teams[0], "team2": teams[1],
                "team1_wins": 0, "team2_wins": 0,
                "first_game_date": date, "last_game_date": date,
            }

        entry = series_data[key]
        entry["last_game_date"] = date

        if pd.notna(visitor_pts) and pd.notna(home_pts):
            winner_team = visitor if visitor_pts > home_pts else home
            if winner_team == teams[0]:
                entry["team1_wins"] += 1
            else:
                entry["team2_wins"] += 1

    if not series_data:
        return pd.DataFrame()

    def parse_date_safe(d):
        try:
            return datetime.strptime(d.strip(), "%a, %b %d, %Y")
        except Exception:
            return datetime.min

    series_list = sorted(series_data.values(), key=lambda x: parse_date_safe(x["first_game_date"]))

    # NBAプレーオフ構造: Round 1=8シリーズ, Round 2=4, CF=2, Finals=1
    round_map = [(1, "First Round", 8), (2, "Second Round", 4),
                 (3, "Conference Finals", 2), (4, "Finals", 1)]
    idx = 0
    for round_num, round_name, size in round_map:
        for _ in range(size):
            if idx >= len(series_list):
                break
            series_list[idx]["round"] = round_num
            series_list[idx]["round_name"] = round_name
            idx += 1

    for s in series_list:
        if s["team1_wins"] >= 4:
            s["winner"] = s["team1"]
        elif s["team2_wins"] >= 4:
            s["winner"] = s["team2"]
        else:
            s["winner"] = ""
        s["series_status"] = f"{s['team1_wins']}-{s['team2_wins']}"

    return pd.DataFrame(series_list)


def fetch_playoff_player_stats(page_suffix: str, filename: str) -> bool:
    """プレーオフ選手スタッツページを取得して保存"""
    try:
        url = f"https://www.basketball-reference.com/playoffs/NBA_{SEASON_YEAR}_{page_suffix}.html"
        print(f"Fetching: {url}")
        html = _fetch_html(url)
        html_expanded = html.replace("<!--", "").replace("-->", "")
        tables = pd.read_html(io.StringIO(html_expanded))

        df = None
        for table in tables:
            t = table.copy()
            if isinstance(t.columns, pd.MultiIndex):
                t.columns = [c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0] for c in t.columns]
            if "Player" in t.columns:
                df = t
                break

        if df is None:
            print(f"  ✗ Player列のあるテーブルが見つかりません")
            return False

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0] for c in df.columns]

        df = df.loc[:, ~df.columns.duplicated()]

        if "Player" in df.columns:
            df = df[df["Player"] != "Player"]
            df = df.dropna(subset=["Player"])
            df["Player"] = df["Player"].str.replace(r"\*$", "", regex=True)

        if "Rk" in df.columns:
            df = df.drop(columns=["Rk"])

        if "Team" in df.columns and "Tm" not in df.columns:
            df = df.rename(columns={"Team": "Tm"})

        if "Tm" in df.columns and isinstance(df["Tm"], pd.Series):
            df["Tm"] = df["Tm"].apply(normalize_team_abbr)

        for col in df.columns:
            if col not in ("Player", "Tm", "Pos") and isinstance(df[col], pd.Series):
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df.to_csv(os.path.join(DATA_DIR, filename), index=False)
        print(f"  ✓ {filename}: {len(df)} 選手")
        return True
    except urllib.error.HTTPError as e:
        print(f"  ✗ HTTP {e.code}: {page_suffix}")
        return False
    except Exception as e:
        print(f"  ✗ {page_suffix} エラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def fetch_playoff_team_stats() -> bool:
    """プレーオフチームスタッツ（per game）をNBA_2026.htmlから取得して保存"""
    try:
        url = f"https://www.basketball-reference.com/playoffs/NBA_{SEASON_YEAR}.html"
        print(f"Fetching: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})
        with urllib.request.urlopen(req, timeout=20) as response:
            html = response.read().decode("utf-8", errors="replace")

        # HTMLコメント展開（BRはコメントアウトでテーブルを埋め込む）
        html_expanded = html.replace("<!--", "").replace("-->", "")
        soup = BeautifulSoup(html_expanded, "html.parser")

        table = soup.find("table", {"id": "per_game-team"})
        if table is None:
            print("  ✗ per_game-team テーブルが見つかりません")
            return False

        stat_cols = [
            ("team_id", "Team"), ("g", "G"), ("mp", "MP"),
            ("fg", "FG"), ("fga", "FGA"), ("fg_pct", "FG%"),
            ("fg3", "3P"), ("fg3a", "3PA"), ("fg3_pct", "3P%"),
            ("ft", "FT"), ("fta", "FTA"), ("ft_pct", "FT%"),
            ("orb", "ORB"), ("drb", "DRB"), ("trb", "TRB"),
            ("ast", "AST"), ("stl", "STL"), ("blk", "BLK"),
            ("tov", "TOV"), ("pf", "PF"), ("pts", "PTS"),
        ]

        rows = []
        for tr in table.find("tbody").find_all("tr"):
            if "thead" in tr.get("class", []):
                continue
            row = {}
            for data_stat, col_name in stat_cols:
                td = tr.find(["td", "th"], {"data-stat": data_stat})
                if td is None:
                    row[col_name] = ""
                    continue
                if data_stat == "team_id":
                    a = td.find("a")
                    text = a.text.strip() if a else td.text.strip()
                    row[col_name] = clean_team_name(text)
                else:
                    row[col_name] = td.text.strip()
            rows.append(row)

        df = pd.DataFrame(rows)
        if df.empty:
            print("  ✗ チームスタッツ行が取得できませんでした")
            return False

        # チーム名なし・League Averageの行をスキップ
        df = df[df["Team"] != ""]
        df = df[df["Team"] != "League Average"]
        print(f"  取得行数: {len(df)} チーム (G列フィルタ前)")

        # フルチーム名を標準略称に変換
        df["Team"] = df["Team"].apply(lambda n: TEAM_ABBR_MAP.get(n, n))

        # 数値変換
        for col in df.columns:
            if col != "Team":
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df.to_csv(os.path.join(DATA_DIR, "po_team_stats.csv"), index=False)
        print(f"  ✓ po_team_stats.csv: {len(df)} チーム")
        return True
    except urllib.error.HTTPError as e:
        print(f"  ✗ HTTP {e.code}: playoff team stats")
        return False
    except Exception as e:
        print(f"  ✗ playoff team stats エラー: {e}")
        import traceback
        traceback.print_exc()
        return False


def fetch_playoff_data() -> dict:
    """プレーオフデータ一式を取得（エラー時はスキップして続行）"""
    results = {}

    # 1. games.html → po_series.csv
    print("\nFetching playoff games...")
    try:
        url = f"https://www.basketball-reference.com/playoffs/NBA_{SEASON_YEAR}_games.html"
        html = _fetch_html(url)
        games_df = _parse_playoff_games_html(html)
        if games_df.empty:
            print("  ✗ プレーオフ試合データが空です")
            results["po_series"] = False
        else:
            series_df = _compute_series_from_games(games_df)
            if not series_df.empty:
                series_df.to_csv(os.path.join(DATA_DIR, "po_series.csv"), index=False)
                print(f"  ✓ po_series.csv: {len(series_df)} シリーズ")
                results["po_series"] = True
            else:
                print("  ✗ シリーズデータが生成できませんでした")
                results["po_series"] = False
    except urllib.error.HTTPError as e:
        print(f"  ✗ games.html HTTP {e.code}")
        results["po_series"] = False
    except Exception as e:
        print(f"  ✗ games エラー: {e}")
        results["po_series"] = False

    # 2. per_game.html → po_player_per_game.csv
    print(f"\n{SLEEP_SEC}秒待機中...")
    time.sleep(SLEEP_SEC)
    results["po_player_per_game"] = fetch_playoff_player_stats("per_game", "po_player_per_game.csv")

    # 4. totals.html → po_player_totals.csv
    print(f"\n{SLEEP_SEC}秒待機中...")
    time.sleep(SLEEP_SEC)
    results["po_player_totals"] = fetch_playoff_player_stats("totals", "po_player_totals.csv")

    # 5. NBA_2026.html per_game-team → po_team_stats.csv
    print(f"\n{SLEEP_SEC}秒待機中...")
    time.sleep(SLEEP_SEC)
    results["po_team_stats"] = fetch_playoff_team_stats()

    return results


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    results = {}

    # 1. メインシーズンページからチームデータ取得
    print("\n=== チームデータ取得 ===")
    try:
        tables = fetch_season_page_tables()
        results["standings"] = extract_standings(tables)
        results["team_advanced"] = extract_team_stats(tables, "advanced", "team_advanced.csv")
        results["team_per_game"] = extract_team_stats(tables, "per_game", "team_per_game.csv")
        results["team_opponent"] = extract_team_stats(tables, "opponent", "team_opponent.csv")
    except Exception as e:
        print(f"  ✗ チームデータ取得失敗: {e}")
        results["standings"] = False
        results["team_advanced"] = False
        results["team_per_game"] = False
        results["team_opponent"] = False

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

    # 3. 試合結果取得
    print("\n=== 試合データ取得 ===")
    print(f"\n{SLEEP_SEC}秒待機中...")
    time.sleep(SLEEP_SEC)
    results["games"] = fetch_games()

    # 4. プレーオフデータ取得
    print("\n=== プレーオフデータ取得 ===")
    print(f"\n{SLEEP_SEC}秒待機中...")
    time.sleep(SLEEP_SEC)
    playoff_results = fetch_playoff_data()
    results.update(playoff_results)

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
