import { getGames, getGameDates, getDramaScores } from "@/lib/data/games";
import { getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import type { Phase } from "@/lib/phase";
import { PreSeasonNotice } from "@/components/phase-switch";
import { GamesClient } from "./client";

// フェーズはパス区分（/games = RS, /games/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderGames(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const ctx = { phase };
  const games = getGames(ctx);
  const dates = getGameDates(ctx);
  const drama = phase === "po" ? Object.fromEntries(getDramaScores()) : {};
  const series = phase === "po" ? getPlayoffSeries() : [];
  return <GamesClient key={phase} games={games} dates={dates} phase={phase} poAvailable={poAvailable} drama={drama} series={series} />;
}
