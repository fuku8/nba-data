"""
nba_api エンドポイント疎通確認スクリプト（v2）
- 正確なパラメータ名をinspectで確認
- V3エンドポイントを使用
- 全カラム名を出力してスキーマ設計に使う
"""
import time
import inspect

SEASON = "2025-26"
SLEEP = 2


def show_params(cls):
    sig = inspect.signature(cls.__init__)
    params = [k for k in sig.parameters.keys() if k != "self"]
    print(f"    Parameters: {params}")


def check(label: str, fn):
    try:
        result = fn()
        print(f"  ✓ {label}")
        print(f"    {result}")
        return True
    except Exception as e:
        print(f"  ✗ {label}: {e}")
        return False


def main():
    from nba_api.stats.endpoints import (
        leaguestandingsv3,
        leaguedashteamstats,
        leaguedashplayerstats,
        leaguegamefinder,
        boxscoretraditionalv3,
        boxscoresummaryv3,
    )

    results = {}

    # --- パラメータ名確認 ---
    print("\n=== パラメータ名確認 ===")
    print("LeagueDashTeamStats:")
    show_params(leaguedashteamstats.LeagueDashTeamStats)
    print("LeagueDashPlayerStats:")
    show_params(leaguedashplayerstats.LeagueDashPlayerStats)
    print("BoxScoreTraditionalV3:")
    show_params(boxscoretraditionalv3.BoxScoreTraditionalV3)
    print("BoxScoreSummaryV3:")
    show_params(boxscoresummaryv3.BoxScoreSummaryV3)

    # --- 1. 順位表 ---
    print("\n=== 1. 順位表 (LeagueStandingsV3) ===")
    time.sleep(SLEEP)
    def get_standings():
        df = leaguestandingsv3.LeagueStandingsV3(season=SEASON).get_data_frames()[0]
        return f"{len(df)} チーム\n    全カラム: {list(df.columns)}"
    results["standings"] = check("LeagueStandingsV3", get_standings)

    # --- 2. チームスタッツ（デフォルトパラメータで実行して列確認） ---
    print("\n=== 2. チームスタッツ Base/PerGame (LeagueDashTeamStats) ===")
    time.sleep(SLEEP)
    def get_team_base():
        df = leaguedashteamstats.LeagueDashTeamStats(season=SEASON).get_data_frames()[0]
        return f"{len(df)} チーム\n    全カラム: {list(df.columns)}"
    results["team_base"] = check("LeagueDashTeamStats (default)", get_team_base)

    # --- 3. チームスタッツ Advanced ---
    print("\n=== 3. チームスタッツ Advanced ===")
    time.sleep(SLEEP)
    team_adv_params = inspect.signature(leaguedashteamstats.LeagueDashTeamStats.__init__).parameters
    measure_param = None
    for p in team_adv_params:
        if "measure" in p.lower():
            measure_param = p
            break
    print(f"  measure param name: {measure_param}")
    def get_team_advanced():
        kwargs = {measure_param: "Advanced"} if measure_param else {}
        df = leaguedashteamstats.LeagueDashTeamStats(season=SEASON, **kwargs).get_data_frames()[0]
        return f"{len(df)} チーム\n    全カラム: {list(df.columns)}"
    results["team_advanced"] = check("LeagueDashTeamStats Advanced", get_team_advanced)

    # --- 4. 選手スタッツ PerGame ---
    print("\n=== 4. 選手スタッツ PerGame (LeagueDashPlayerStats) ===")
    time.sleep(SLEEP)
    player_params = inspect.signature(leaguedashplayerstats.LeagueDashPlayerStats.__init__).parameters
    per_mode_param = None
    season_type_param = None
    for p in player_params:
        if "per_mode" in p.lower():
            per_mode_param = p
        if "season_type" in p.lower():
            season_type_param = p
    print(f"  per_mode param name: {per_mode_param}")
    print(f"  season_type param name: {season_type_param}")
    def get_player_per_game():
        kwargs = {per_mode_param: "PerGame"} if per_mode_param else {}
        df = leaguedashplayerstats.LeagueDashPlayerStats(season=SEASON, **kwargs).get_data_frames()[0]
        return f"{len(df)} 選手\n    全カラム: {list(df.columns)}"
    results["player_per_game"] = check("LeagueDashPlayerStats PerGame", get_player_per_game)

    # --- 5. 選手スタッツ Totals ---
    print("\n=== 5. 選手スタッツ Totals ===")
    time.sleep(SLEEP)
    def get_player_totals():
        kwargs = {per_mode_param: "Totals"} if per_mode_param else {}
        df = leaguedashplayerstats.LeagueDashPlayerStats(season=SEASON, **kwargs).get_data_frames()[0]
        return f"{len(df)} 選手\n    全カラム: {list(df.columns)}"
    results["player_totals"] = check("LeagueDashPlayerStats Totals", get_player_totals)

    # --- 6. 選手スタッツ Advanced ---
    print("\n=== 6. 選手スタッツ Advanced ===")
    time.sleep(SLEEP)
    player_measure_param = None
    for p in player_params:
        if "measure" in p.lower():
            player_measure_param = p
            break
    print(f"  measure param name: {player_measure_param}")
    def get_player_advanced():
        kwargs = {player_measure_param: "Advanced"} if player_measure_param else {}
        df = leaguedashplayerstats.LeagueDashPlayerStats(season=SEASON, **kwargs).get_data_frames()[0]
        return f"{len(df)} 選手\n    全カラム: {list(df.columns)}"
    results["player_advanced"] = check("LeagueDashPlayerStats Advanced", get_player_advanced)

    # --- 7. 試合結果 RS ---
    print("\n=== 7. 試合結果 + gameId (LeagueGameFinder RS) ===")
    time.sleep(SLEEP)
    def get_games():
        df = leaguegamefinder.LeagueGameFinder(
            season_nullable=SEASON,
            season_type_nullable="Regular Season",
            league_id_nullable="00",
        ).get_data_frames()[0]
        sample = df.iloc[0].to_dict() if len(df) > 0 else {}
        return f"{len(df)} 行\n    全カラム: {list(df.columns)}\n    sample: {sample}"
    results["games"] = check("LeagueGameFinder RS", get_games)

    # --- 8. PO選手スタッツ ---
    print("\n=== 8. PO選手スタッツ PerGame ===")
    time.sleep(SLEEP)
    def get_po_player():
        kwargs = {}
        if per_mode_param:
            kwargs[per_mode_param] = "PerGame"
        if season_type_param:
            kwargs[season_type_param] = "Playoffs"
        df = leaguedashplayerstats.LeagueDashPlayerStats(season=SEASON, **kwargs).get_data_frames()[0]
        return f"{len(df)} 選手"
    results["po_player"] = check("LeagueDashPlayerStats Playoffs PerGame", get_po_player)

    # --- 9. PO試合 gameId ---
    print("\n=== 9. PO試合 gameId ===")
    time.sleep(SLEEP)
    po_game_id = None
    def get_po_games():
        nonlocal po_game_id
        df = leaguegamefinder.LeagueGameFinder(
            season_nullable=SEASON,
            season_type_nullable="Playoffs",
            league_id_nullable="00",
        ).get_data_frames()[0]
        if len(df) > 0:
            po_game_id = str(df["GAME_ID"].iloc[0])
        return f"{len(df)} 行, sample gameId={po_game_id}"
    results["po_games"] = check("LeagueGameFinder Playoffs", get_po_games)

    # --- 10. BoxScoreTraditionalV3 ---
    if po_game_id:
        print(f"\n=== 10. BoxScoreTraditionalV3 (gameId={po_game_id}) ===")
        time.sleep(SLEEP)
        def get_boxscore_v3():
            frames = boxscoretraditionalv3.BoxScoreTraditionalV3(
                game_id=po_game_id
            ).get_data_frames()
            print(f"    frames数: {len(frames)}")
            for i, f in enumerate(frames):
                print(f"    frame[{i}] shape={f.shape}, cols={list(f.columns)[:8]}")
            player_df = frames[0]
            return f"frame[0]: {len(player_df)} 行\n    全カラム: {list(player_df.columns)}"
        results["boxscore_v3"] = check("BoxScoreTraditionalV3", get_boxscore_v3)

        # --- 11. BoxScoreSummaryV3 ---
        print(f"\n=== 11. BoxScoreSummaryV3 (gameId={po_game_id}) ===")
        time.sleep(SLEEP)
        def get_summary_v3():
            frames = boxscoresummaryv3.BoxScoreSummaryV3(
                game_id=po_game_id
            ).get_data_frames()
            print(f"    frames数: {len(frames)}")
            for i, f in enumerate(frames):
                print(f"    frame[{i}] shape={f.shape}, cols={list(f.columns)}")
            return "完了"
        results["summary_v3"] = check("BoxScoreSummaryV3", get_summary_v3)
    else:
        print("\n  ! PO gameId 未取得のため BoxScore スキップ")

    # --- 結果サマリー ---
    print("\n=== 結果サマリー ===")
    for k, v in results.items():
        print(f"  {'✓' if v else '✗'} {k}")
    ok = sum(1 for v in results.values() if v)
    print(f"\n{ok}/{len(results)} 成功")


if __name__ == "__main__":
    main()
