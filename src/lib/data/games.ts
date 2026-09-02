import fs from "fs";
import path from "path";
import { readCsvFile, csvToObjects, num, phaseFile, type DataCtx } from "./csv-utils";
import { allSeasons, currentSeason, seasonDir } from "../season.ts";

export interface GameResult {
  gameId: string;
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  homePts: number;
  awayPts: number;
  homeWl: string;
  homeFgPct: number;
  homeFg3Pct: number;
  awayFgPct: number;
  awayFg3Pct: number;
}

export function getGames(ctx: DataCtx = {}): GameResult[] {
  const rows = readCsvFile(phaseFile("games.csv", ctx.phase), ctx.season);
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["GAME_ID"] && d["HOME_TEAM"] && d["AWAY_TEAM"])
    .map((d) => ({
      gameId:      d["GAME_ID"] || "",
      gameDate:    d["GAME_DATE"] || "",
      homeTeam:    d["HOME_TEAM"] || "",
      awayTeam:    d["AWAY_TEAM"] || "",
      homePts:     num(d["HOME_PTS"]),
      awayPts:     num(d["AWAY_PTS"]),
      homeWl:      d["HOME_WL"] || "",
      homeFgPct:   num(d["HOME_FG_PCT"]),
      homeFg3Pct:  num(d["HOME_FG3_PCT"]),
      awayFgPct:   num(d["AWAY_FG_PCT"]),
      awayFg3Pct:  num(d["AWAY_FG3_PCT"]),
    }));
}

export function getGamesByDate(date: string, ctx: DataCtx = {}): GameResult[] {
  return getGames(ctx).filter((g) => g.gameDate === date);
}

export function getRecentGames(count: number = 30, ctx: DataCtx = {}): GameResult[] {
  const all = getGames(ctx);
  return all.slice(-count).reverse();
}

export function getGameDates(ctx: DataCtx = {}): string[] {
  const all = getGames(ctx);
  const seen = new Set<string>();
  const dates: string[] = [];
  for (const g of all) {
    if (!seen.has(g.gameDate)) {
      seen.add(g.gameDate);
      dates.push(g.gameDate);
    }
  }
  return dates.reverse();
}

export interface TeamGameMargin {
  gameId: string;
  gameDate: string;
  opponent: string;
  margin: number; // 自チーム得点 − 相手得点
  teamScore: number;
  oppScore: number;
  isHome: boolean;
  fgPct: number;
  fg3Pct: number;
  oppFgPct: number;
  oppFg3Pct: number;
}

// シーズン心電図用: 指定チームの全試合の点差系列（日付順）
export function getTeamMargins(abbr: string, ctx: DataCtx = {}): TeamGameMargin[] {
  return getGames(ctx)
    .filter((g) => g.homeTeam === abbr || g.awayTeam === abbr)
    .map((g) => {
      const isHome = g.homeTeam === abbr;
      return {
        gameId: g.gameId,
        gameDate: g.gameDate,
        opponent: isHome ? g.awayTeam : g.homeTeam,
        margin: isHome ? g.homePts - g.awayPts : g.awayPts - g.homePts,
        teamScore: isHome ? g.homePts : g.awayPts,
        oppScore: isHome ? g.awayPts : g.homePts,
        isHome,
        fgPct: isHome ? g.homeFgPct : g.awayFgPct,
        fg3Pct: isHome ? g.homeFg3Pct : g.awayFg3Pct,
        oppFgPct: isHome ? g.awayFgPct : g.homeFgPct,
        oppFg3Pct: isHome ? g.awayFg3Pct : g.homeFg3Pct,
      };
    });
}

// boxscore JSON（現状POのみ）を現季→過去季の順で探す。gameId はシーズン跨ぎで一意。
// RS中は現季の boxscores/ が無いので、静的エクスポートの generateStaticParams を空にしないために過去季も含める（plan.md §12-11）
export function findBoxScore(gameId: string): { path: string; season: string } | null {
  for (const season of allSeasons()) {
    const p = path.join(seasonDir(season), "boxscores", `${gameId}.json`);
    if (fs.existsSync(p)) return { path: p, season };
  }
  return null;
}

export function boxScoreGameIds(): string[] {
  return allSeasons().flatMap((season) => {
    const dir = path.join(seasonDir(season), "boxscores");
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  });
}

// 熱戦指数: leadChanges + timesTied − 最終点差。boxscore JSON（現状POのみ取得）がある試合だけ
export function getDramaScores(season?: string): Map<string, number> {
  const map = new Map<string, number>();
  const dir = path.join(seasonDir(season ?? currentSeason()), "boxscores");
  if (!fs.existsSync(dir)) return map;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      if (d.gameStatus !== 3) continue; // 試合中に保存されたboxscoreは統計が途中値のため除外
      const ts = d.teamStats?.[0];
      const [a, b] = d.teams ?? [];
      if (!ts || !a || !b) continue;
      const margin = Math.abs((a.score ?? 0) - (b.score ?? 0));
      map.set(d.gameId, (ts.leadChanges ?? 0) + (ts.timesTied ?? 0) - margin);
    } catch {
      // 壊れたboxscoreはスキップ
    }
  }
  return map;
}

export function getLatestGameDate(): string {
  const filepath = path.join(process.cwd(), "data", "games.csv");
  if (!fs.existsSync(filepath)) return "不明";
  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length < 2) return "不明";
    const lastLine = lines[lines.length - 1];
    const cols = lastLine.split(",");
    // GAME_DATE is the 2nd column (index 1)
    return cols[1]?.trim() || "不明";
  } catch {
    return "不明";
  }
}
