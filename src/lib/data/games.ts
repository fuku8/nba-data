import fs from "fs";
import path from "path";
import { num } from "./csv-utils";

export interface GameResult {
  date: string;
  visitor: string;
  visitorPts: number;
  home: string;
  homePts: number;
}

export function getGames(): GameResult[] {
  const filepath = path.join(process.cwd(), "data", "games.csv");
  if (!fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.trim().split("\n");
  // Skip header
  return lines.slice(1)
    .map((line) => {
      // Date field contains commas (e.g. "Tue, Oct 21, 2025") so split from the right
      // Format: "Day, Mon DD, YYYY,Visitor,VisitorPTS,Home,HomePTS"
      const parts = line.split(",");
      if (parts.length < 7) return null;
      // Last 4 fields are: Visitor, VisitorPTS, Home, HomePTS
      const homePts = parts.pop()!.trim();
      const home = parts.pop()!.trim();
      const visitorPts = parts.pop()!.trim();
      const visitor = parts.pop()!.trim();
      const date = parts.join(",").trim();
      if (!date || !visitor || !home) return null;
      return {
        date,
        visitor,
        visitorPts: num(visitorPts),
        home,
        homePts: num(homePts),
      };
    })
    .filter((g): g is GameResult => g !== null);
}

export function getGamesByDate(date: string): GameResult[] {
  const all = getGames();
  return all.filter((g) => g.date === date);
}

export function getRecentGames(count: number = 30): GameResult[] {
  const all = getGames();
  return all.slice(-count).reverse();
}

export function getGameDates(): string[] {
  const all = getGames();
  // Preserve CSV order (chronological) and deduplicate
  const seen = new Set<string>();
  const dates: string[] = [];
  for (const g of all) {
    if (!seen.has(g.date)) {
      seen.add(g.date);
      dates.push(g.date);
    }
  }
  return dates.reverse();
}
