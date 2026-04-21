import { getPlayoffPlayerPerGame, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PlayoffPlayersClient } from "./client";

export const revalidate = 3600;

export default function PlayoffPlayersPage() {
  if (!isPlayoffDataAvailable()) {
    return (
      <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>
    );
  }

  const players = getPlayoffPlayerPerGame().filter((p) => p.team !== "TOT");
  return <PlayoffPlayersClient players={players} />;
}
