#!/usr/bin/env python3
"""OG 画像用の日本語サブセットフォントを生成する（plan §13-1 段階2）。

日本語名対応表（player_names_ja.csv / team_names_ja.csv）の全文字＋ASCII＋
英語名のダイアクリティカルを Noto Sans JP からサブセット化し、
src/assets/og/NotoSansJP-{400,700}-subset.ttf に保存する。

対応表を更新したら（毎季の繰越後の fetch-player-names-ja.py の後に）再実行する。
必要: pip install fonttools / Noto Sans JP 可変フォント（引数か既定URLから取得）
"""
import io
import os
import string
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_URL = "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"
OUT_DIR = os.path.join(ROOT, "src", "assets", "og")


def charset() -> str:
    chars = set(string.printable)
    for name in ("player_names_ja.csv", "team_names_ja.csv"):
        path = os.path.join(ROOT, "data", name)
        with open(path, encoding="utf-8") as f:
            for line in f.read().splitlines()[1:]:
                parts = line.split(",")
                if len(parts) >= 3:
                    chars.update(parts[1])  # NAME_EN（ダイアクリティカル付き）
                    chars.update(parts[2])  # NAME_JA
    chars.update("·＝・ー%–—")
    return "".join(sorted(c for c in chars if not c.isspace() or c == " "))


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if src:
        data = open(src, "rb").read()
    else:
        print(f"downloading {FONT_URL}")
        data = urllib.request.urlopen(FONT_URL).read()
    text = charset()
    print(f"glyph chars: {len(text)}")
    os.makedirs(OUT_DIR, exist_ok=True)
    for wght in (400, 700):
        font = TTFont(io.BytesIO(data))
        instantiateVariableFont(font, {"wght": wght}, inplace=True)
        ss = subset.Subsetter(subset.Options(hinting=False, desubroutinize=True))
        ss.populate(text=text)
        ss.subset(font)
        out = os.path.join(OUT_DIR, f"NotoSansJP-{wght}-subset.ttf")
        font.save(out)
        print(f"{out} {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    main()
