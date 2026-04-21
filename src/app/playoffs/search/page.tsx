import { getPlayoffPlayerPerGame, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PlayoffSearchClient } from "./client";

export const revalidate = 3600;

export default function PlayoffSearchPage() {
  if (!isPlayoffDataAvailable()) {
    return <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>;
  }

  const players = getPlayoffPlayerPerGame().filter((p) => p.team !== "TOT");
  return <PlayoffSearchClient players={players} />;
}
