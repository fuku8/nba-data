import { getPlayoffPlayerPerGame, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PlayoffLeadersClient } from "./client";

export const revalidate = 3600;

export default function PlayoffLeadersPage() {
  if (!isPlayoffDataAvailable()) {
    return (
      <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>
    );
  }

  const players = getPlayoffPlayerPerGame().filter((p) => p.team !== "TOT");
  return <PlayoffLeadersClient players={players} />;
}
