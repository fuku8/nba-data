"""
選手・チームの日本語名を Wikipedia の言語間リンク（en → ja）から取得し、
data/player_names_ja.csv / data/team_names_ja.csv に保存する。
出典を Wikipedia 日本語版に揃える理由: 日本語検索で流通している表記に一致させるため（2026-09-02 決定）。
- 既存行の SOURCE が manual / 暫定 の行は上書きしない（手で直した表記・暫定の音写を保つ）
- 見つからない選手は NAME_JA 空のまま残す（アプリ側は英語名にフォールバック）
使い方: python3 scripts/fetch-player-names-ja.py
"""
import csv
import json
import os
import re
import time
import urllib.parse
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
API = "https://en.wikipedia.org/w/api.php"
UA = "nba-data/1.0 (https://nba-data.pages.dev; player name localization)"


def langlinks_ja(titles: list[str]) -> dict[str, str]:
    """en タイトル → ja タイトル。リダイレクトは解決し、元のタイトルに戻して返す"""
    q = urllib.parse.urlencode({
        "action": "query", "prop": "langlinks", "lllang": "ja", "lllimit": "max",
        "redirects": 1, "format": "json", "titles": "|".join(titles),
    })
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    query = data.get("query", {})
    back = {}  # 解決後タイトル → 元タイトル
    for kind in ("normalized", "redirects"):
        for m in query.get(kind, []):
            back[m["to"]] = back.get(m["from"], m["from"])
    out = {}
    for page in query.get("pages", {}).values():
        ll = page.get("langlinks")
        if not ll:
            continue
        out[back.get(page["title"], page["title"])] = ll[0]["*"]
    return out


def resolve(names: list[str]) -> dict[str, str]:
    found = {}
    for i in range(0, len(names), 50):
        found.update(langlinks_ja(names[i:i + 50]))
        time.sleep(0.5)
    # 同名の曖昧さ回避ページに当たった選手は "(basketball)" 付きで再照会
    missing = [n for n in names if n not in found]
    for i in range(0, len(missing), 50):
        got = langlinks_ja([f"{n} (basketball)" for n in missing[i:i + 50]])
        found.update({k.removesuffix(" (basketball)"): v for k, v in got.items()})
        time.sleep(0.5)
    # それでも無い選手は日本語版を英語名で全文検索し、記事本文に英語名（各記事の冒頭に併記される）を含む先頭ヒットを採る
    for n in [n for n in names if n not in found]:
        hit = search_ja(n)
        if hit:
            found[n] = hit
        time.sleep(0.3)
    return found


def search_ja(name: str) -> str | None:
    """日本語版を英語名で全文検索し、候補記事の英語版へのリンク先が英語名と一致するものだけ採る（別人・チーム記事を除く）"""
    q = urllib.parse.urlencode({
        "action": "query", "list": "search", "srsearch": f'"{name}"', "srlimit": 5, "format": "json",
    })
    req = urllib.request.Request(f"https://ja.wikipedia.org/w/api.php?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        titles = [h["title"] for h in json.load(r).get("query", {}).get("search", [])]
    if not titles:
        return None
    q = urllib.parse.urlencode({
        "action": "query", "prop": "langlinks", "lllang": "en", "format": "json", "titles": "|".join(titles),
    })
    req = urllib.request.Request(f"https://ja.wikipedia.org/w/api.php?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        pages = json.load(r).get("query", {}).get("pages", {}).values()
    for page in pages:
        for ll in page.get("langlinks", []):
            if ll["*"].split(" (")[0] == name:
                return page["title"]
    return None


def write(path: str, key: str, rows: list[tuple[str, str]]) -> tuple[int, list[str]]:
    keep = {}
    if os.path.exists(path):
        with open(path, newline="") as f:
            for r in csv.DictReader(f):
                if r["NAME_JA"] and r["SOURCE"] != "wikipedia-ja":  # manual / 暫定 は保つ
                    keep[r[key]] = r
    names = [n for _, n in rows]
    ja = resolve([n for k, n in rows if k not in keep])
    missing = []
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([key, "NAME_EN", "NAME_JA", "SOURCE"])
        for k, n in rows:
            if k in keep:
                w.writerow([k, n, keep[k]["NAME_JA"], keep[k]["SOURCE"]])
            elif n in ja:
                # 日本語版の記事名から曖昧さ回避の括弧を除く（例「ジェイレン・ウィリアムズ (バスケットボール)」）
                w.writerow([k, n, ja[n].split(" (")[0], "wikipedia-ja"])
            else:
                w.writerow([k, n, "", ""]); missing.append(n)
    return len(names), missing


with open(os.path.join(DATA_DIR, "player_profiles.csv"), newline="") as f:
    players = [(r["PLAYER_ID"], r["PLAYER_NAME"]) for r in csv.DictReader(f)]
n, miss = write(os.path.join(DATA_DIR, "player_names_ja.csv"), "PLAYER_ID", players)
print(f"players: {n - len(miss)}/{n} 取得。未取得 {len(miss)}: {', '.join(miss)}")

with open(os.path.join(DATA_DIR, "standings.csv"), newline="") as f:
    # NBA.com はクリッパーズだけ略称欄が空（表記も "LA Clippers"）なので補う。teams.ts の逆引きと同じ対処
    teams = [(r["TEAM_ABBREVIATION"] or {"LA Clippers": "LAC"}.get(r["TEAM_NAME"], ""), r["TEAM_NAME"]) for r in csv.DictReader(f)]
n, miss = write(os.path.join(DATA_DIR, "team_names_ja.csv"), "TEAM_ABBREVIATION", teams)
print(f"teams: {n - len(miss)}/{n} 取得。未取得: {', '.join(miss)}")
