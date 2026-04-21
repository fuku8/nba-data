import { getPlayoffSeries, getPlayoffPlayerPerGame, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PlayoffsTopClient } from "./client";

export const revalidate = 3600;

export default function PlayoffsPage() {
  if (!isPlayoffDataAvailable()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">プレーオフ開幕前</h1>
        <p className="text-muted-foreground">プレーオフが開始されるとデータが表示されます。</p>
      </div>
    );
  }

  const series = getPlayoffSeries();
  const players = getPlayoffPlayerPerGame().filter((p) => p.team !== "TOT");

  return <PlayoffsTopClient series={series} players={players} />;
}
