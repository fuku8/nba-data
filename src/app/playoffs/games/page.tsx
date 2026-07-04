import fs from "fs";
import path from "path";
import { isPlayoffDataAvailable, getPlayoffSeries } from "@/lib/data/playoffs";
import { readCsvFile, csvToObjects, num } from "@/lib/data/csv-utils";
import { PlayoffGamesClient } from "./client";

export const revalidate = 3600;

export interface PoGame {
  gameId:    string;
  gameDate:  string;
  homeTeam:  string;
  awayTeam:  string;
  homePts:   number;
  awayPts:   number;
  homeWl:    string;
  drama:     number | null; // 熱戦指数: leadChanges + timesTied − 最終点差
}

function getDramaScores(): Map<string, number> {
  const map = new Map<string, number>();
  const dir = path.join(process.cwd(), "data", "boxscores");
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

function getPoGames(): PoGame[] {
  const rows = readCsvFile("po_games.csv");
  const data = csvToObjects(rows);
  const drama = getDramaScores();
  return data
    .filter((d) => d["GAME_ID"] && d["HOME_TEAM"])
    .map((d) => ({
      gameId:   d["GAME_ID"] || "",
      gameDate: d["GAME_DATE"] || "",
      homeTeam: d["HOME_TEAM"] || "",
      awayTeam: d["AWAY_TEAM"] || "",
      homePts:  num(d["HOME_PTS"]),
      awayPts:  num(d["AWAY_PTS"]),
      homeWl:   d["HOME_WL"] || "",
      drama:    drama.get(d["GAME_ID"] || "") ?? null,
    }));
}

export default function PlayoffGamesPage() {
  if (!isPlayoffDataAvailable()) {
    return <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>;
  }

  const series = getPlayoffSeries();
  const games  = getPoGames();
  return <PlayoffGamesClient series={series} games={games} />;
}
