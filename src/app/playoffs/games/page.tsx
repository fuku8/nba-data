import { getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { readCsvFile, csvToObjects } from "@/lib/data/csv-utils";
import { PlayoffGamesClient } from "./client";

export const revalidate = 3600;

function getPlayoffGames() {
  const rows = readCsvFile("po_series.csv");
  const series = csvToObjects(rows);
  // games.csvからプレーオフ期間（4月以降）の試合を取得
  const gameRows = readCsvFile("games.csv");
  const games = csvToObjects(gameRows);
  const poGames = games.filter((g) => {
    const date = g["Date"] || "";
    return date.includes("Apr") || date.includes("May") || date.includes("Jun");
  });
  return poGames;
}

export default function PlayoffGamesPage() {
  if (!isPlayoffDataAvailable()) {
    return <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>;
  }

  const series = getPlayoffSeries();
  const games = getPlayoffGames();
  return <PlayoffGamesClient series={series} games={games} />;
}
