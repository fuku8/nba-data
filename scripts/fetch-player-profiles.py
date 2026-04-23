"""
nba_api の CommonPlayerInfo エンドポイントで選手プロフィールを分割取得し、
data/player_profiles.csv に累積保存するスクリプト。
"""
import argparse
import os
import time

import pandas as pd
from nba_api.stats.endpoints import commonplayerinfo

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
PROFILES_CSV = os.path.join(DATA_DIR, "player_profiles.csv")
PER_GAME_CSV = os.path.join(DATA_DIR, "player_per_game.csv")
PO_PER_GAME_CSV = os.path.join(DATA_DIR, "po_player_per_game.csv")

RATE_LIMIT_SLEEP_SEC = 1

COLUMNS = [
    "PLAYER_ID", "PLAYER_NAME", "BIRTHDATE", "HEIGHT", "WEIGHT", "POSITION",
    "JERSEY", "COUNTRY", "SCHOOL", "FROM_YEAR", "DRAFT_YEAR", "DRAFT_ROUND", "DRAFT_NUMBER",
]


def load_fetched_ids() -> set[int]:
    """取得済み PLAYER_ID を読み込む。"""
    if not os.path.exists(PROFILES_CSV):
        return set()
    df = pd.read_csv(PROFILES_CSV, usecols=["PLAYER_ID"])
    return set(df["PLAYER_ID"].tolist())


def load_target_ids() -> list[int]:
    """player_per_game.csv と po_player_per_game.csv から全選手 ID をマージして返す。"""
    ids: set[int] = set()
    for path in [PER_GAME_CSV, PO_PER_GAME_CSV]:
        if os.path.exists(path):
            df = pd.read_csv(path, usecols=["PLAYER_ID"])
            ids.update(df["PLAYER_ID"].tolist())
    return sorted(ids)


def fetch_profile(player_id: int) -> dict | None:
    """CommonPlayerInfo で1選手分のプロフィールを取得して dict を返す。失敗時は None。"""
    try:
        row = commonplayerinfo.CommonPlayerInfo(player_id=player_id).get_data_frames()[0].iloc[0]

        def val(field: str, default: str = "") -> str:
            v = row.get(field, default)
            if v is None or (isinstance(v, float) and pd.isna(v)) or v == "":
                return default
            return str(v).strip()

        draft_year = val("DRAFT_YEAR")
        draft_round = val("DRAFT_ROUND")
        draft_number = val("DRAFT_NUMBER")

        # 未ドラフトの場合は空文字
        if draft_year == "Undrafted":
            draft_year = draft_round = draft_number = ""

        from_year_raw = val("FROM_YEAR")
        try:
            from_year: int | str = int(float(from_year_raw)) if from_year_raw else ""
        except (ValueError, TypeError):
            from_year = from_year_raw

        return {
            "PLAYER_ID":    int(row["PERSON_ID"]),
            "PLAYER_NAME":  val("DISPLAY_FIRST_LAST"),
            "BIRTHDATE":    val("BIRTHDATE"),
            "HEIGHT":       val("HEIGHT"),
            "WEIGHT":       val("WEIGHT"),
            "POSITION":     val("POSITION"),
            "JERSEY":       val("JERSEY"),
            "COUNTRY":      val("COUNTRY"),
            "SCHOOL":       val("SCHOOL"),
            "FROM_YEAR":    from_year,
            "DRAFT_YEAR":   draft_year,
            "DRAFT_ROUND":  draft_round,
            "DRAFT_NUMBER": draft_number,
        }
    except Exception:
        return None


def append_profiles(records: list[dict]) -> None:
    """プロフィールレコードを player_profiles.csv に追記する。"""
    df_new = pd.DataFrame(records, columns=COLUMNS)
    write_header = not os.path.exists(PROFILES_CSV) or os.path.getsize(PROFILES_CSV) == 0
    df_new.to_csv(PROFILES_CSV, mode="a", header=write_header, index=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="選手プロフィール取得スクリプト")
    parser.add_argument("--batch", type=int, default=50, help="1回に取得する件数（デフォルト: 50）")
    parser.add_argument("--dry-run", action="store_true", help="進捗確認のみ（実際には取得しない）")
    args = parser.parse_args()

    print("=== 選手プロフィール取得 ===")

    fetched_ids = load_fetched_ids()
    all_ids = load_target_ids()
    pending_ids = [pid for pid in all_ids if pid not in fetched_ids]

    total = len(all_ids)
    already = len(fetched_ids)
    pending = len(pending_ids)
    batch_ids = pending_ids[: args.batch]

    print(f"取得済み: {already} 件")
    print(f"取得対象: {pending} 件")
    print(f"今回取得: {len(batch_ids)} 件")

    if args.dry_run:
        print("\n--dry-run モード: 取得をスキップします。")
        return

    if not batch_ids:
        print("\n取得対象がありません。")
        return

    success_count = 0
    fail_count = 0
    records: list[dict] = []

    for i, player_id in enumerate(batch_ids, 1):
        # 名前を事前に特定するために per_game CSV から取れれば表示に使う
        label = str(player_id)
        try:
            profile = fetch_profile(player_id)
            if profile:
                label = f"{profile['PLAYER_NAME']} ({player_id})"
                records.append(profile)
                success_count += 1
                print(f"  [{i}/{len(batch_ids)}] {label} ... ✓")
        except Exception as e:
            print(f"  [{i}/{len(batch_ids)}] {label} ... ✗ エラー: {e}")
            fail_count += 1

        time.sleep(RATE_LIMIT_SLEEP_SEC)

    if records:
        append_profiles(records)

    new_fetched = already + success_count
    remaining = max(0, len(pending_ids) - success_count)

    print("\n=== 完了 ===")
    print(f"今回取得: {success_count} 件成功, {fail_count} 件失敗")
    print(f"累計取得済み: {new_fetched}/{total} 件")
    print(f"残り: {remaining} 件")


if __name__ == "__main__":
    main()
