#!/usr/bin/env python3
"""ショットチャート一括取得（ローカル実行専用・feel-viz Phase 3）

チーム単位で shotchartdetail を叩き（RS 30チーム + PO 出場チーム）、
選手別に data/shots/{playerId}.json へ保存する。
形式: {"rs": [[LOC_X, LOC_Y, SHOT_MADE_FLAG], ...], "po": [...]}
座標は NBA 標準（原点=リング中心、1単位=0.1フィート、LOC_X -250..250）。

nba_api は GitHub Actions からブロックされるため、手動ローカル実行が前提。
"""
import csv
import importlib.util
import json
import os
from collections import defaultdict

_here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("fetcher", os.path.join(_here, "fetch-nba-data.py"))
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)

from nba_api.stats.endpoints import shotchartdetail  # noqa: E402

SHOTS_DIR = os.path.join(fetcher.DATA_DIR, "shots")


def team_ids(csv_name: str) -> list[int]:
    with open(os.path.join(fetcher.DATA_DIR, csv_name)) as f:
        return sorted({int(r["TEAM_ID"]) for r in csv.DictReader(f) if r.get("TEAM_ID")})


def fetch_team_shots(team_id: int, season_type: str):
    frames = fetcher.get_data_frames(
        f"shotchart {season_type} team {team_id}",
        lambda: fetcher.make_endpoint(
            shotchartdetail.ShotChartDetail,
            team_id=team_id,
            player_id=0,
            season_nullable=fetcher.SEASON,
            season_type_all_star=season_type,
            context_measure_simple="FGA",
        ),
    )
    return frames[0]


def write_shots(shots: dict[int, dict[str, list]]):
    for pid, d in shots.items():
        with open(os.path.join(SHOTS_DIR, f"{pid}.json"), "w") as f:
            json.dump(d, f, separators=(",", ":"))
    total = sum(len(d["rs"]) + len(d["po"]) for d in shots.values())
    print(f"✓ {len(shots)}選手 / 合計{total}ショットを {SHOTS_DIR} に保存")


def main():
    fetcher.configure_nba_api_session()
    os.makedirs(SHOTS_DIR, exist_ok=True)

    jobs = [(tid, "Regular Season", "rs") for tid in team_ids("standings.csv")]
    jobs += [(tid, "Playoffs", "po") for tid in team_ids("po_player_per_game.csv")]

    shots: dict[int, dict[str, list]] = defaultdict(lambda: {"rs": [], "po": []})
    try:
        for tid, stype, key in jobs:
            fetcher.sleep(f"shots {stype} {tid}")
            df = fetch_team_shots(tid, stype)
            for pid, x, y, made in df[["PLAYER_ID", "LOC_X", "LOC_Y", "SHOT_MADE_FLAG"]].values.tolist():
                shots[int(pid)][key].append([int(x), int(y), int(made)])
            print(f"  ✓ {stype} team {tid}: {len(df)}本")
    except Exception:
        # ponytail: 途中失敗時もここまでの取得分は保存する。再開（resume）機能はないので
        # 「PARTIAL」を確認したら jobs を最初からやり直すこと
        print("✗ 取得中にエラー発生。ここまでの分を PARTIAL 保存して中断します（最初からやり直してください）")
        write_shots(shots)
        raise

    write_shots(shots)


if __name__ == "__main__":
    main()
