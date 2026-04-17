"""
プレーオフデータ検証スクリプト
Basketball Reference の playoffs 専用 URL が取得可能か、
テーブル構造（列名・行数）を確認する。

実行結果はすべて stdout に出力（データは保存しない）。
"""
import pandas as pd
import io
import urllib.request
import urllib.error
from bs4 import BeautifulSoup
import time

SEASON_YEAR = "2026"
SLEEP_SEC = 5

TARGETS = [
    {
        "label": "プレーオフ ブラケット / シリーズ結果",
        "url": f"https://www.basketball-reference.com/playoffs/NBA_{SEASON_YEAR}.html",
        "expected_data": "po_series.csv / po_team_per_game.csv の元データ",
    },
    {
        "label": "選手 PO per game スタッツ",
        "url": f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}_playoffs_per_game.html",
        "expected_data": "po_player_per_game.csv の元データ",
    },
    {
        "label": "選手 PO totals スタッツ",
        "url": f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}_playoffs_totals.html",
        "expected_data": "po_player_totals.csv の元データ",
    },
    {
        "label": "選手 PO advanced スタッツ",
        "url": f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}_playoffs_advanced.html",
        "expected_data": "po_player_advanced.csv の元データ",
    },
    {
        "label": "チーム PO スタッツ",
        "url": f"https://www.basketball-reference.com/leagues/NBA_{SEASON_YEAR}_playoffs_team.html",
        "expected_data": "po_team_per_game.csv の元データ（補完用）",
    },
]


def fetch_html(url: str) -> str:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"  ! 403 受信 - 30秒待機後リトライ...")
            time.sleep(30)
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="replace")
        raise


def inspect_table(df: pd.DataFrame, table_index: int) -> None:
    """テーブルの列名・行数・サンプル行を出力"""
    print(f"\n  [テーブル {table_index}] 行数={len(df)}")

    # マルチインデックス解消
    if isinstance(df.columns, pd.MultiIndex):
        flat = [c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0] for c in df.columns]
        df.columns = flat
        print(f"  ※ MultiIndex 解消後")

    cols = list(df.columns)
    print(f"  列数={len(cols)}")
    print(f"  列名: {cols}")

    if len(df) > 0:
        sample = df.iloc[0]
        print(f"  先頭行サンプル:")
        for k, v in sample.items():
            if str(k) not in ("", "nan") and str(v) not in ("", "nan"):
                print(f"    {k!r}: {v!r}")


def verify_url(target: dict) -> bool:
    label = target["label"]
    url = target["url"]
    expected = target["expected_data"]

    print(f"\n{'='*60}")
    print(f"検証: {label}")
    print(f"URL: {url}")
    print(f"用途: {expected}")
    print(f"{'='*60}")

    try:
        html = fetch_html(url)
        print(f"  ✓ HTTP 200 OK ({len(html):,} bytes)")

        # コメントアウト内の隠しテーブルを展開（BRのtotalsページなど）
        html_expanded = html.replace("<!--", "").replace("-->", "")

        tables = pd.read_html(io.StringIO(html_expanded))
        print(f"  ✓ テーブル数: {len(tables)}")

        if not tables:
            print(f"  ✗ テーブルが0件（データ未公開の可能性）")
            return False

        # 全テーブルのサマリを出力（最大5テーブル）
        for i, table in enumerate(tables[:5]):
            inspect_table(table.copy(), i)

        # Player列がある最初のテーブルを特定
        for i, table in enumerate(tables):
            t = table.copy()
            if isinstance(t.columns, pd.MultiIndex):
                t.columns = [c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0] for c in t.columns]
            if "Player" in t.columns:
                print(f"\n  → Player列あり: テーブル{i}（po_player_*.csv の候補）")
                # ユニーク選手数
                player_col = t["Player"]
                players = [p for p in player_col if p and p != "Player"]
                print(f"  → ユニーク選手数（概算）: {len(set(players))}")
                break

        # チームスタッツ用: Team列またはFranchise列チェック
        for i, table in enumerate(tables):
            t = table.copy()
            if isinstance(t.columns, pd.MultiIndex):
                t.columns = [c[1] if c[1] and "Unnamed" not in str(c[1]) else c[0] for c in t.columns]
            if "Team" in t.columns or "Franchise" in t.columns:
                team_col = "Team" if "Team" in t.columns else "Franchise"
                teams = [v for v in t[team_col] if v and v != team_col]
                print(f"\n  → {team_col}列あり: テーブル{i}（po_team_*.csv の候補）")
                print(f"  → チーム数（概算）: {len(set(teams))}")
                break

        # BRのplayoffsトップページ: series テーブルを探す
        if "playoffs/NBA_" in url:
            soup = BeautifulSoup(html, "html.parser")
            series_sections = [tag for tag in soup.find_all("div") if "all_" in (tag.get("id") or "")]
            print(f"\n  BRページ内 id='all_*' セクション数: {len(series_sections)}")
            for sec in series_sections[:10]:
                sid = sec.get("id", "")
                print(f"    - {sid}")

        return True

    except urllib.error.HTTPError as e:
        print(f"  ✗ HTTP エラー: {e.code} {e.reason}")
        if e.code == 404:
            print(f"  → ページ未公開（プレーオフ未開始、またはURLが違う）")
        return False
    except Exception as e:
        print(f"  ✗ 例外: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("NBA プレーオフデータ検証スクリプト")
    print(f"対象シーズン: {SEASON_YEAR}")
    print(f"実行日時: ", end="")
    from datetime import datetime, timezone
    print(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))

    results = {}
    for i, target in enumerate(TARGETS):
        results[target["label"]] = verify_url(target)
        if i < len(TARGETS) - 1:
            print(f"\n{SLEEP_SEC}秒待機中...")
            time.sleep(SLEEP_SEC)

    print(f"\n\n{'='*60}")
    print("検証結果サマリ")
    print(f"{'='*60}")
    for label, ok in results.items():
        status = "✓ 取得可" if ok else "✗ 取得不可"
        print(f"  {status}: {label}")

    ok_count = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\n合計: {ok_count}/{total} URL が取得可能")

    if ok_count == 0:
        print("\n→ プレーオフ未開始（または全URL 404）。データ取得は開幕後に再実行してください。")
    elif ok_count < total:
        print(f"\n→ 一部URLが取得不可。✗ のURLはプレーオフ進行状況を確認してください。")
    else:
        print(f"\n→ 全URL取得可。fetch-bref-data.py へのプレーオフ処理追加を進めてください。")


if __name__ == "__main__":
    main()
