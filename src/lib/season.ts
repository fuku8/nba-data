import fs from "fs";
import path from "path";

// シーズンの単一の真実は data/season.txt（1行）。fetchスクリプトも同じファイルを読む。
// 現シーズンのデータは data/ 直下、過去シーズンは data/<season>/ に置く（scripts/rollover.sh で繰越）
const DATA_DIR = path.join(process.cwd(), "data");
const SEASON_RE = /^\d{4}-\d{2}$/;

export function currentSeason(): string {
  const s = fs.readFileSync(path.join(DATA_DIR, "season.txt"), "utf-8").trim();
  if (!SEASON_RE.test(s)) throw new Error(`data/season.txt が不正: "${s}"`);
  return s;
}

// 過去シーズン（data/<season>/ が存在するもの）。新しい順
export function archivedSeasons(): string[] {
  return fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && SEASON_RE.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();
}

// 現シーズン＋過去シーズン（新しい順・重複なし）
export function allSeasons(): string[] {
  const cur = currentSeason();
  return [cur, ...archivedSeasons().filter((s) => s !== cur)];
}

// ?season= の値を既知のシーズンに解決する。不明・未指定は現シーズン
export function resolveSeason(param?: string | null): string {
  if (param && allSeasons().includes(param)) return param;
  return currentSeason();
}

export function seasonDir(season: string): string {
  return season === currentSeason() ? DATA_DIR : path.join(DATA_DIR, season);
}

// "2025-26" → 2026（POの開催年）
export function poYear(season: string): number {
  return parseInt(season.slice(0, 4), 10) + 1;
}
