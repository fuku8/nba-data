#!/usr/bin/env python3
"""ハッスル・トラッキング取得（ローカル実行専用・feel-viz Phase 4）

6回のAPI呼び出しで以下を生成する:
- data/player_hustle.csv        (RS・per game)
- data/po_player_hustle.csv     (PO・per game)
- data/player_speed.csv         (RS・Totals: 走行距離・平均速度)
- data/po_player_speed.csv      (PO・Totals: 同上)
- data/player_possessions.csv   (RS・per game: タッチ・保持時間)
- data/po_player_possessions.csv(PO・per game: 同上。選手タイプ判定用)

nba_api は GitHub Actions からブロックされるため、手動ローカル実行が前提。
"""
import importlib.util
import os

_here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("fetcher", os.path.join(_here, "fetch-nba-data.py"))
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)

from nba_api.stats.endpoints import leaguedashptstats, leaguehustlestatsplayer  # noqa: E402

HUSTLE_COLS = [
    "PLAYER_ID", "PLAYER_NAME", "TEAM_ABBREVIATION", "G", "MIN",
    "CONTESTED_SHOTS", "DEFLECTIONS", "CHARGES_DRAWN", "SCREEN_ASSISTS",
    "LOOSE_BALLS_RECOVERED", "BOX_OUTS",
]
SPEED_COLS = ["PLAYER_ID", "PLAYER_NAME", "TEAM_ABBREVIATION", "GP", "MIN", "DIST_MILES", "AVG_SPEED"]
POSS_COLS = ["PLAYER_ID", "PLAYER_NAME", "TEAM_ABBREVIATION", "GP", "MIN", "TOUCHES", "TIME_OF_POSS"]


def save(df, cols, fname):
    df[cols].to_csv(os.path.join(fetcher.DATA_DIR, fname), index=False)
    print(f"  ✓ {fname}: {len(df)}行")


def main():
    fetcher.configure_nba_api_session()

    for stype, fname in [("Regular Season", "player_hustle.csv"), ("Playoffs", "po_player_hustle.csv")]:
        fetcher.sleep(f"hustle {stype}")
        df = fetcher.get_data_frames(
            f"hustle {stype}",
            lambda stype=stype: fetcher.make_endpoint(
                leaguehustlestatsplayer.LeagueHustleStatsPlayer,
                season=fetcher.SEASON,
                season_type_all_star=stype,
                per_mode_time="PerGame",
            ),
        )[0]
        save(df, HUSTLE_COLS, fname)

    for measure, per_mode, stype, cols, fname in [
        ("SpeedDistance", "Totals", "Regular Season", SPEED_COLS, "player_speed.csv"),
        ("SpeedDistance", "Totals", "Playoffs", SPEED_COLS, "po_player_speed.csv"),
        ("Possessions", "PerGame", "Regular Season", POSS_COLS, "player_possessions.csv"),
        ("Possessions", "PerGame", "Playoffs", POSS_COLS, "po_player_possessions.csv"),
    ]:
        fetcher.sleep(f"tracking {measure} {stype}")
        df = fetcher.get_data_frames(
            f"tracking {measure} {stype}",
            lambda measure=measure, per_mode=per_mode, stype=stype: fetcher.make_endpoint(
                leaguedashptstats.LeagueDashPtStats,
                season=fetcher.SEASON,
                pt_measure_type=measure,
                player_or_team="Player",
                per_mode_simple=per_mode,
                season_type_all_star=stype,
            ),
        )[0]
        save(df, cols, fname)


if __name__ == "__main__":
    main()
