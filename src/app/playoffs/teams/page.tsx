import { getPlayoffTeamStats, getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PlayoffTeamsClient } from "./teams-client";

export const revalidate = 3600;

export default function PlayoffTeamsPage() {
  if (!isPlayoffDataAvailable()) {
    return <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>;
  }

  const teamStats = getPlayoffTeamStats();
  const series = getPlayoffSeries();

  return <PlayoffTeamsClient teamStats={teamStats} series={series} />;
}
