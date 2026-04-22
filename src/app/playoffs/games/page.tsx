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
}

function getPoGames(): PoGame[] {
  const rows = readCsvFile("po_games.csv");
  const data = csvToObjects(rows);
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
