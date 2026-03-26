import { readCsvFile, csvToObjects, num } from "./csv-utils";

export interface GameResult {
  date: string;
  visitor: string;
  visitorPts: number;
  home: string;
  homePts: number;
}

export function getGames(): GameResult[] {
  const rows = readCsvFile("games.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["Date"] && d["Visitor"] && d["Home"])
    .map((d) => ({
      date: d["Date"] || "",
      visitor: d["Visitor"] || "",
      visitorPts: num(d["VisitorPTS"]),
      home: d["Home"] || "",
      homePts: num(d["HomePTS"]),
    }));
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
  const dates = new Set(all.map((g) => g.date));
  return [...dates].sort().reverse();
}
