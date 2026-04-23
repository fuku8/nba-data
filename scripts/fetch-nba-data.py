"""
nba_api を使用して NBA 2025-26 シーズンデータを取得・保存するスクリプト。
Basketball Reference スクレイピングの完全代替。
"""
import os
import json
import sys
import time
from datetime import datetime, timedelta, timezone
import pandas as pd
import requests
from nba_api.stats.endpoints import (
    leaguestandingsv3,
    leaguedashteamstats,
    leaguedashplayerstats,
    leaguegamefinder,
    scoreboardv2,
    boxscoresummaryv3,
    boxscoretraditionalv3,
)
from nba_api.stats.library.http import NBAStatsHTTP, STATS_HEADERS
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

SEASON = "2025-26"
SLEEP_SEC = 2
API_RETRIES = int(os.environ.get("NBA_API_RETRIES", "3"))
API_TIMEOUT_SEC = int(os.environ.get("NBA_API_TIMEOUT_SEC", "60"))
API_BACKOFF_SEC = int(os.environ.get("NBA_API_BACKOFF_SEC", "5"))
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
BOXSCORE_DIR = os.path.join(DATA_DIR, "boxscores")
REQUEST_HEADERS = {
    **STATS_HEADERS,
    "Origin": "https://www.nba.com",
    "Referer": "https://www.nba.com/",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Sec-Ch-Ua-Platform": '"macOS"',
}

TEAM_FULL_TO_ABBR: dict[str, str] = {
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


def sleep(label: str = ""):
    print(f"  {SLEEP_SEC}秒待機中...{f' ({label})' if label else ''}")
    time.sleep(SLEEP_SEC)


def configure_nba_api_session() -> None:
    session = requests.Session()
    session.headers.update(REQUEST_HEADERS)
    adapter = HTTPAdapter(
        max_retries=Retry(
            total=0,
            connect=2,
            read=0,
            status=2,
            backoff_factor=1,
            allowed_methods=frozenset(["GET"]),
            status_forcelist=(429, 500, 502, 503, 504),
            respect_retry_after_header=True,
        )
    )
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    NBAStatsHTTP.set_session(session)


def make_endpoint(endpoint_cls, **kwargs):
    return endpoint_cls(headers=REQUEST_HEADERS, timeout=API_TIMEOUT_SEC, **kwargs)


def get_data_frames(label: str, endpoint_factory, attempts: int = API_RETRIES):
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return endpoint_factory().get_data_frames()
        except Exception as e:
            last_error = e
            if attempt == attempts:
                break
            print(f"  ! {label}: {e} / retry {attempt + 1}/{attempts}")
            time.sleep(API_BACKOFF_SEC * attempt)
    raise last_error


# ─── 1. 順位表 ───────────────────────────────────────────────

def fetch_standings() -> bool:
    try:
        df = get_data_frames(
            "standings",
            lambda: make_endpoint(leaguestandingsv3.LeagueStandingsV3, season=SEASON),
        )[0]
        full_name = df["TeamCity"] + " " + df["TeamName"]
        out = pd.DataFrame({
            "TEAM_ID":         df["TeamID"],
            "TEAM_NAME":       full_name,
            "TEAM_ABBREVIATION": full_name.map(TEAM_FULL_TO_ABBR),
            "CONFERENCE":      df["Conference"],
            "WINS":            df["WINS"],
            "LOSSES":          df["LOSSES"],
            "WIN_PCT":         df["WinPCT"],
            "CONFERENCE_GB":   df["ConferenceGamesBack"],
            "PLAYOFF_RANK":    df["PlayoffRank"],
            "POINTS_PG":       df["PointsPG"],
            "OPP_POINTS_PG":   df["OppPointsPG"],
            "DIFF_POINTS_PG":  df["DiffPointsPG"],
            "HOME":            df["HOME"],
            "ROAD":            df["ROAD"],
            "L10":             df["L10"],
            "CURRENT_STREAK":  df["strCurrentStreak"],
            "CLINCHED_PLAYOFF": df["ClinchedPostSeason"].fillna(0).astype(int),
        })
        out.to_csv(os.path.join(DATA_DIR, "standings.csv"), index=False)
        print(f"  ✓ standings.csv: {len(out)} チーム")
        return True
    except Exception as e:
        print(f"  ✗ standings: {e}")
        import traceback; traceback.print_exc()
        return False


# ─── 2. チームスタッツ ─────────────────────────────────────

def fetch_team_stats() -> bool:
    try:
        base_df = get_data_frames(
            "team_per_game",
            lambda: make_endpoint(
                leaguedashteamstats.LeagueDashTeamStats,
                season=SEASON,
                per_mode_detailed="PerGame",
                measure_type_detailed_defense="Base",
            ),
        )[0]

        keep_base = [
            "TEAM_ID", "TEAM_NAME", "GP", "W", "L", "W_PCT", "MIN",
            "FGM", "FGA", "FG_PCT", "FG3M", "FG3A", "FG3_PCT",
            "FTM", "FTA", "FT_PCT",
            "OREB", "DREB", "REB", "AST", "TOV", "STL", "BLK", "BLKA",
            "PF", "PFD", "PTS", "PLUS_MINUS",
        ]
        base_df[keep_base].to_csv(os.path.join(DATA_DIR, "team_per_game.csv"), index=False)
        print(f"  ✓ team_per_game.csv: {len(base_df)} チーム")

        sleep("team_advanced")

        adv_df = get_data_frames(
            "team_advanced",
            lambda: make_endpoint(
                leaguedashteamstats.LeagueDashTeamStats,
                season=SEASON,
                measure_type_detailed_defense="Advanced",
            ),
        )[0]

        keep_adv = [
            "TEAM_ID", "TEAM_NAME", "GP",
            "OFF_RATING", "DEF_RATING", "NET_RATING",
            "AST_PCT", "AST_TO", "AST_RATIO",
            "OREB_PCT", "DREB_PCT", "REB_PCT", "TM_TOV_PCT",
            "EFG_PCT", "TS_PCT", "PACE", "POSS", "PIE",
        ]
        adv_df[keep_adv].to_csv(os.path.join(DATA_DIR, "team_advanced.csv"), index=False)
        print(f"  ✓ team_advanced.csv: {len(adv_df)} チーム")
        return True
    except Exception as e:
        print(f"  ✗ team_stats: {e}")
        import traceback; traceback.print_exc()
        return False


# ─── 3. 選手スタッツ ───────────────────────────────────────

PLAYER_PG_COLS = [
    "PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION", "AGE",
    "GP", "W", "L", "W_PCT", "MIN",
    "FGM", "FGA", "FG_PCT", "FG3M", "FG3A", "FG3_PCT",
    "FTM", "FTA", "FT_PCT",
    "OREB", "DREB", "REB", "AST", "TOV", "STL", "BLK", "BLKA",
    "PF", "PFD", "PTS", "PLUS_MINUS", "DD2", "TD3",
]

PLAYER_ADV_COLS = [
    "PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION", "AGE",
    "GP", "MIN",
    "OFF_RATING", "DEF_RATING", "NET_RATING",
    "AST_PCT", "AST_TO", "AST_RATIO",
    "OREB_PCT", "DREB_PCT", "REB_PCT", "TM_TOV_PCT",
    "EFG_PCT", "TS_PCT", "USG_PCT", "PACE", "PIE", "POSS",
]


def fetch_player_stats(season_type: str = "Regular Season", prefix: str = "") -> bool:
    common = dict(season=SEASON, season_type_all_star=season_type)
    ok = True
    try:
        pg_df = get_data_frames(
            f"{prefix}player_per_game",
            lambda: make_endpoint(
                leaguedashplayerstats.LeagueDashPlayerStats,
                per_mode_detailed="PerGame", **common
            ),
        )[0]
        fname = f"{prefix}player_per_game.csv"
        pg_df[PLAYER_PG_COLS].to_csv(os.path.join(DATA_DIR, fname), index=False)
        print(f"  ✓ {fname}: {len(pg_df)} 選手")
    except Exception as e:
        print(f"  ✗ {prefix}player_per_game: {e}"); ok = False

    sleep("player_totals")
    try:
        tot_df = get_data_frames(
            f"{prefix}player_totals",
            lambda: make_endpoint(
                leaguedashplayerstats.LeagueDashPlayerStats,
                per_mode_detailed="Totals", **common
            ),
        )[0]
        fname = f"{prefix}player_totals.csv"
        tot_df[PLAYER_PG_COLS].to_csv(os.path.join(DATA_DIR, fname), index=False)
        print(f"  ✓ {fname}: {len(tot_df)} 選手")
    except Exception as e:
        print(f"  ✗ {prefix}player_totals: {e}"); ok = False

    sleep("player_advanced")
    try:
        adv_df = get_data_frames(
            f"{prefix}player_advanced",
            lambda: make_endpoint(
                leaguedashplayerstats.LeagueDashPlayerStats,
                measure_type_detailed_defense="Advanced", **common
            ),
        )[0]
        fname = f"{prefix}player_advanced.csv"
        adv_df[PLAYER_ADV_COLS].to_csv(os.path.join(DATA_DIR, fname), index=False)
        print(f"  ✓ {fname}: {len(adv_df)} 選手")
    except Exception as e:
        print(f"  ✗ {prefix}player_advanced: {e}"); ok = False

    return ok


# ─── 4. 試合結果 ───────────────────────────────────────────

def _deduplicate_games(df: pd.DataFrame) -> pd.DataFrame:
    """LeagueGameFinder（チーム×試合 2行）→ 1試合1行に集約"""
    games = []
    for game_id, group in df.groupby("GAME_ID"):
        home_rows = group[~group["MATCHUP"].str.contains("@")]
        away_rows = group[group["MATCHUP"].str.contains("@")]
        if len(home_rows) == 0 or len(away_rows) == 0:
            continue
        h = home_rows.iloc[0]
        a = away_rows.iloc[0]
        games.append({
            "GAME_ID":       game_id,
            "GAME_DATE":     h["GAME_DATE"],
            "HOME_TEAM":     h["TEAM_ABBREVIATION"],
            "AWAY_TEAM":     a["TEAM_ABBREVIATION"],
            "HOME_PTS":      int(h["PTS"]),
            "AWAY_PTS":      int(a["PTS"]),
            "HOME_WL":       h["WL"],
            "HOME_FG_PCT":   h["FG_PCT"],
            "HOME_FG3_PCT":  h["FG3_PCT"],
            "AWAY_FG_PCT":   a["FG_PCT"],
            "AWAY_FG3_PCT":  a["FG3_PCT"],
        })
    result = pd.DataFrame(games)
    if not result.empty:
        result = result.sort_values("GAME_DATE").reset_index(drop=True)
    return result


def _fetch_recent_playoff_scoreboard_games(days: int = 5) -> pd.DataFrame:
    """LeagueGameFinder の反映遅延を補うため、直近の Final PO 試合を ScoreboardV2 から取得する。"""
    games: list[dict] = []
    today = datetime.now(timezone.utc).date()

    for offset in range(days):
        target_date = today - timedelta(days=offset)
        date_arg = target_date.strftime("%m/%d/%Y")
        try:
            frames = get_data_frames(
                f"scoreboard {date_arg}",
                lambda date_arg=date_arg: make_endpoint(
                    scoreboardv2.ScoreboardV2,
                    game_date=date_arg,
                    league_id="00",
                ),
                attempts=2,
            )
            game_header = frames[0]
            line_score = frames[1]
        except Exception as e:
            print(f"  ! scoreboard {date_arg}: {e}")
            continue

        if game_header.empty or line_score.empty:
            continue

        for _, game in game_header.iterrows():
            game_id = str(game.get("GAME_ID", ""))
            if not game_id.startswith("004") or int(game.get("GAME_STATUS_ID", 0)) != 3:
                continue

            game_lines = line_score[line_score["GAME_ID"].astype(str) == game_id]
            home = game_lines[game_lines["TEAM_ID"] == game.get("HOME_TEAM_ID")]
            away = game_lines[game_lines["TEAM_ID"] == game.get("VISITOR_TEAM_ID")]
            if home.empty or away.empty:
                continue

            h = home.iloc[0]
            a = away.iloc[0]
            home_pts = int(h["PTS"])
            away_pts = int(a["PTS"])
            games.append({
                "GAME_ID": game_id,
                "GAME_DATE": str(game.get("GAME_DATE_EST", target_date.isoformat())).split("T")[0],
                "HOME_TEAM": h["TEAM_ABBREVIATION"],
                "AWAY_TEAM": a["TEAM_ABBREVIATION"],
                "HOME_PTS": home_pts,
                "AWAY_PTS": away_pts,
                "HOME_WL": "W" if home_pts > away_pts else "L",
                "HOME_FG_PCT": h["FG_PCT"],
                "HOME_FG3_PCT": h["FG3_PCT"],
                "AWAY_FG_PCT": a["FG_PCT"],
                "AWAY_FG3_PCT": a["FG3_PCT"],
            })

    result = pd.DataFrame(games)
    if not result.empty:
        result = result.sort_values(["GAME_DATE", "GAME_ID"]).reset_index(drop=True)
    return result


def fetch_games() -> tuple[bool, list[str]]:
    """RS試合 → games.csv。PO試合 → po_games.csv。POのgameIdリストを返す"""
    po_game_ids: list[str] = []
    try:
        rs_df = get_data_frames(
            "games RS",
            lambda: make_endpoint(
                leaguegamefinder.LeagueGameFinder,
                season_nullable=SEASON,
                season_type_nullable="Regular Season",
                league_id_nullable="00",
            ),
        )[0]
        rs_games = _deduplicate_games(rs_df)
        rs_games.to_csv(os.path.join(DATA_DIR, "games.csv"), index=False)
        print(f"  ✓ games.csv: {len(rs_games)} 試合")
    except Exception as e:
        print(f"  ✗ games (RS): {e}")
        import traceback; traceback.print_exc()
        return False, po_game_ids

    sleep("playoff_games")
    try:
        po_df = get_data_frames(
            "games Playoffs",
            lambda: make_endpoint(
                leaguegamefinder.LeagueGameFinder,
                season_nullable=SEASON,
                season_type_nullable="Playoffs",
                league_id_nullable="00",
            ),
        )[0]
        if not po_df.empty:
            po_games = _deduplicate_games(po_df)
            scoreboard_games = _fetch_recent_playoff_scoreboard_games()
            if not scoreboard_games.empty:
                before = len(po_games)
                po_games = pd.concat([po_games, scoreboard_games], ignore_index=True)
                po_games = (
                    po_games
                    .drop_duplicates(subset=["GAME_ID"], keep="last")
                    .sort_values(["GAME_DATE", "GAME_ID"])
                    .reset_index(drop=True)
                )
                added = len(po_games) - before
                print(f"  ✓ scoreboard 補完: {len(scoreboard_games)} 試合確認, {added} 試合追加")
            po_game_ids = po_games["GAME_ID"].astype(str).unique().tolist()
            po_games.to_csv(os.path.join(DATA_DIR, "po_games.csv"), index=False)
            print(f"  ✓ po_games.csv: {len(po_games)} 試合, {len(po_game_ids)} gameId")
    except Exception as e:
        print(f"  ✗ games (Playoffs): {e}")

    return True, po_game_ids


# ─── 5. POシリーズ集計 ──────────────────────────────────────

def compute_po_series(po_games_ready: bool) -> bool:
    try:
        if not po_games_ready:
            print("  ✗ games が失敗したため、po_series は集計しません")
            return False

        po_games_path = os.path.join(DATA_DIR, "po_games.csv")
        if not os.path.exists(po_games_path):
            print("  ✗ po_games.csv が存在しません")
            return False

        games_df = pd.read_csv(po_games_path)
        series_data: dict = {}

        for _, row in games_df.iterrows():
            home = str(row["HOME_TEAM"])
            away = str(row["AWAY_TEAM"])
            teams = sorted([home, away])
            key = f"{teams[0]}_{teams[1]}"

            if key not in series_data:
                series_data[key] = {
                    "team1": teams[0], "team2": teams[1],
                    "team1_wins": 0, "team2_wins": 0,
                    "first_game_date": row["GAME_DATE"],
                    "last_game_date":  row["GAME_DATE"],
                }

            entry = series_data[key]
            entry["last_game_date"] = row["GAME_DATE"]

            if bool(pd.notna(row["HOME_PTS"])) and bool(pd.notna(row["AWAY_PTS"])):
                winner = home if row["HOME_PTS"] > row["AWAY_PTS"] else away
                if winner == teams[0]:
                    entry["team1_wins"] += 1
                else:
                    entry["team2_wins"] += 1

        series_list = sorted(series_data.values(), key=lambda x: x["first_game_date"])

        round_map = [
            (1, "First Round",        8),
            (2, "Second Round",       4),
            (3, "Conference Finals",  2),
            (4, "Finals",             1),
        ]
        idx = 0
        for round_num, round_name, size in round_map:
            for _ in range(size):
                if idx >= len(series_list):
                    break
                series_list[idx]["round"] = round_num
                series_list[idx]["round_name"] = round_name
                idx += 1

        for s in series_list:
            s["winner"] = s["team1"] if s["team1_wins"] >= 4 else (s["team2"] if s["team2_wins"] >= 4 else "")
            s["series_status"] = f"{s['team1_wins']}-{s['team2_wins']}"

        pd.DataFrame(series_list).to_csv(os.path.join(DATA_DIR, "po_series.csv"), index=False)
        print(f"  ✓ po_series.csv: {len(series_list)} シリーズ")
        return True
    except Exception as e:
        print(f"  ✗ po_series: {e}")
        import traceback; traceback.print_exc()
        return False


# ─── 6. POボックススコア ────────────────────────────────────

def fetch_boxscores(po_game_ids: list[str]) -> bool:
    if not po_game_ids:
        print("  ! PO gameId なし、スキップ")
        return True

    os.makedirs(BOXSCORE_DIR, exist_ok=True)
    success = 0

    for game_id in po_game_ids:
        out_path = os.path.join(BOXSCORE_DIR, f"{game_id}.json")
        if os.path.exists(out_path):  # 差分取得
            success += 1
            continue

        sleep(f"boxscore {game_id}")
        try:
            frames = get_data_frames(
                f"boxscore summary {game_id}",
                lambda game_id=game_id: make_endpoint(
                    boxscoresummaryv3.BoxScoreSummaryV3,
                    game_id=game_id,
                ),
            )
            game_info   = frames[0].iloc[0].to_dict() if len(frames[0]) > 0 else {}
            line_scores = frames[4]   # period1Score〜period4Score per team
            team_stats  = frames[7]   # points, reboundsTotal, etc.

            home_id = game_info.get("homeTeamId")

            teams = []
            for _, row in line_scores.iterrows():
                teams.append({
                    "teamId":  row.get("teamId"),
                    "tricode": row.get("teamTricode"),
                    "wins":    row.get("teamWins"),
                    "losses":  row.get("teamLosses"),
                    "q1":      row.get("period1Score"),
                    "q2":      row.get("period2Score"),
                    "q3":      row.get("period3Score"),
                    "q4":      row.get("period4Score"),
                    "score":   row.get("score"),
                    "isHome":  (row.get("teamId") == home_id),
                })

            stats = []
            for _, row in team_stats.iterrows():
                stats.append({
                    "teamId":                  row.get("teamId"),
                    "tricode":                 row.get("teamTricode"),
                    "points":                  row.get("points"),
                    "reboundsTotal":           row.get("reboundsTotal"),
                    "assists":                 row.get("assists"),
                    "steals":                  row.get("steals"),
                    "blocks":                  row.get("blocks"),
                    "turnovers":               row.get("turnovers"),
                    "fieldGoalsPercentage":    row.get("fieldGoalsPercentage"),
                    "threePointersPercentage": row.get("threePointersPercentage"),
                    "freeThrowsPercentage":    row.get("freeThrowsPercentage"),
                    "pointsInThePaint":        row.get("pointsInThePaint"),
                    "pointsFastBreak":         row.get("pointsFastBreak"),
                    "benchPoints":             row.get("benchPoints"),
                    "biggestLead":             row.get("biggestLead"),
                    "leadChanges":             row.get("leadChanges"),
                    "timesTied":               row.get("timesTied"),
                })

            # 選手スタッツ (BoxScoreTraditionalV3)
            players = []
            try:
                trad_frames = get_data_frames(
                    f"boxscore traditional {game_id}",
                    lambda game_id=game_id: make_endpoint(
                        boxscoretraditionalv3.BoxScoreTraditionalV3,
                        game_id=game_id,
                    ),
                )
                player_df = trad_frames[0]
                player_df = player_df[player_df["minutes"].notna() & (player_df["minutes"] != "")]
                for _, p in player_df.iterrows():
                    players.append({
                        "personId":    p.get("personId"),
                        "name":        f"{p.get('firstName', '')} {p.get('familyName', '')}".strip(),
                        "teamId":      p.get("teamId"),
                        "tricode":     p.get("teamTricode"),
                        "position":    p.get("position", ""),
                        "minutes":     p.get("minutes", ""),
                        "points":      p.get("points"),
                        "reboundsTotal": p.get("reboundsTotal"),
                        "reboundsOffensive": p.get("reboundsOffensive"),
                        "reboundsDefensive": p.get("reboundsDefensive"),
                        "assists":     p.get("assists"),
                        "steals":      p.get("steals"),
                        "blocks":      p.get("blocks"),
                        "turnovers":   p.get("turnovers"),
                        "foulsPersonal": p.get("foulsPersonal"),
                        "fieldGoalsMade":      p.get("fieldGoalsMade"),
                        "fieldGoalsAttempted": p.get("fieldGoalsAttempted"),
                        "fieldGoalsPercentage": p.get("fieldGoalsPercentage"),
                        "threePointersMade":      p.get("threePointersMade"),
                        "threePointersAttempted": p.get("threePointersAttempted"),
                        "threePointersPercentage": p.get("threePointersPercentage"),
                        "freeThrowsMade":      p.get("freeThrowsMade"),
                        "freeThrowsAttempted": p.get("freeThrowsAttempted"),
                        "freeThrowsPercentage": p.get("freeThrowsPercentage"),
                        "plusMinusPoints": p.get("plusMinusPoints"),
                    })
            except Exception as e2:
                print(f"  ! player stats {game_id}: {e2}")

            result = {
                "gameId":         game_id,
                "gameStatus":     game_info.get("gameStatus"),
                "gameStatusText": game_info.get("gameStatusText", ""),
                "gameTimeUTC":    game_info.get("gameTimeUTC", ""),
                "teams":          teams,
                "teamStats":      stats,
                "players":        players,
            }

            with open(out_path, "w") as f:
                json.dump(result, f, default=str)
            success += 1
        except Exception as e:
            print(f"  ✗ boxscore {game_id}: {e}")

    print(f"  ✓ boxscores: {success}/{len(po_game_ids)} 生成/確認済み")
    return success > 0


# ─── main ──────────────────────────────────────────────────

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    configure_nba_api_session()
    results: dict[str, bool] = {}

    print("\n=== 1. 順位表 ===")
    results["standings"] = fetch_standings()

    print("\n=== 2. チームスタッツ ===")
    sleep("team_stats")
    results["team_stats"] = fetch_team_stats()

    print("\n=== 3. 選手スタッツ（RS） ===")
    sleep("player_stats_rs")
    results["player_stats_rs"] = fetch_player_stats("Regular Season", "")

    print("\n=== 4. 試合結果 ===")
    sleep("games")
    games_ok, po_game_ids = fetch_games()
    results["games"] = games_ok

    print("\n=== 5. PO選手スタッツ ===")
    sleep("player_stats_po")
    results["po_player_stats"] = fetch_player_stats("Playoffs", "po_")

    print("\n=== 6. POシリーズ集計 ===")
    results["po_series"] = compute_po_series(games_ok)

    print("\n=== 7. POボックススコア ===")
    sleep("boxscores")
    results["boxscores"] = fetch_boxscores(po_game_ids)

    print("\n=== 結果サマリー ===")
    for k, v in results.items():
        print(f"  {'✓' if v else '✗'} {k}")
    ok = sum(1 for v in results.values() if v)
    print(f"\n完了: {ok}/{len(results)} 成功")
    if ok != len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
