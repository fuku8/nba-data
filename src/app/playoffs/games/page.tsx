import { getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { readCsvFile, csvToObjects } from "@/lib/data/csv-utils";
import { PlayoffGamesClient } from "./client";

export const revalidate = 3600;

function getPlayoffGames() {
  const seriesRows = readCsvFile("po_series.csv");
  const seriesData = csvToObjects(seriesRows);

  // po_series.csv の first_game_date からプレーオフ開始日を取得
  const poStartDate = seriesData
    .map((s) => s["first_game_date"])
    .filter(Boolean)
    .reduce<Date | null>((min, d) => {
      const parsed = new Date(d);
      return !min || parsed < min ? parsed : min;
    }, null);

  if (!poStartDate) return [];

  const gameRows = readCsvFile("games.csv");
  const games = csvToObjects(gameRows);

  return games.filter((g) => {
    const date = g["Date"];
    if (!date) return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed >= poStartDate;
  });
}

export default function PlayoffGamesPage() {
  if (!isPlayoffDataAvailable()) {
    return <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>;
  }

  const series = getPlayoffSeries();
  const games = getPlayoffGames();
  return <PlayoffGamesClient series={series} games={games} />;
}
