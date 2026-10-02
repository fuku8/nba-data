import fs from "fs";
import path from "path";
import { SEASON_RE } from "./season-path.ts";

// シーズンの単一の真実は data/season.txt（1行）。fetchスクリプトも同じファイルを読む。
// 現シーズンのデータは data/ 直下、過去シーズンは data/<season>/ に置く（scripts/rollover.sh で繰越）
const DATA_DIR = path.join(process.cwd(), "data");

export function currentSeason(): string {
  const s = fs.readFileSync(path.join(DATA_DIR, "season.txt"), "utf-8").trim();
  if (!SEASON_RE.test(s)) throw new Error(`data/season.txt が不正: "${s}"`);
  return s;
}

// 過去シーズン（data/<season>/ が存在するもの）。新しい順。
// 現シーズンと同名のディレクトリ（確定後のスナップショット。繰越前に一時的に共存する）は除外する
export function archivedSeasons(): string[] {
  const cur = currentSeason();
  return fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && SEASON_RE.test(d.name) && d.name !== cur)
    .map((d) => d.name)
    .sort()
    .reverse();
}

// 現シーズン＋過去シーズン（新しい順）
export function allSeasons(): string[] {
  return [currentSeason(), ...archivedSeasons()];
}

export function seasonDir(season: string): string {
  return season === currentSeason() ? DATA_DIR : path.join(DATA_DIR, season);
}

// "2025-26" → 2026（POの開催年）
export function poYear(season: string): number {
  return parseInt(season.slice(0, 4), 10) + 1;
}

// 過去季に残すページ（[[...season]] ルート。plan.md §13-10）の generateStaticParams: 今季（季なし）＋過去季。
// 今季を必ず含むので、過去季が無い間も空にならない（空だと静的エクスポートのビルドが落ちる。ROLLOVER.md）
export const seasonParams = () => [{ season: [] as string[] }, ...archivedSeasons().map((s) => ({ season: [s] }))];

// [[...season]] の値から表示する季を決める。pastSeason は過去季のときだけ入る（リンクの出し分けに使う）。
// 今季でも過去季でもなければ null
export function resolveSeason(seg?: string[]): { season: string; pastSeason?: string } | null {
  if (!seg || seg.length === 0) return { season: currentSeason() };
  return seg.length === 1 && archivedSeasons().includes(seg[0]) ? { season: seg[0], pastSeason: seg[0] } : null;
}
