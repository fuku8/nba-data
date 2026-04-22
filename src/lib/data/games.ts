import fs from "fs";
import path from "path";
import { readCsvFile, csvToObjects, num } from "./csv-utils";

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

export function getGames(): GameResult[] {
  const rows = readCsvFile("games.csv");
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

export function getGamesByDate(date: string): GameResult[] {
  return getGames().filter((g) => g.gameDate === date);
}

export function getRecentGames(count: number = 30): GameResult[] {
  const all = getGames();
  return all.slice(-count).reverse();
}

export function getGameDates(): string[] {
  const all = getGames();
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
