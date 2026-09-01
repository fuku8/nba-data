import { getGames, getGameDates, getDramaScores } from "@/lib/data/games";
import { getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { resolvePhase } from "@/lib/phase";
import { GamesClient } from "./client";

export const revalidate = 3600;

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const { phase: phaseParam } = await searchParams;
  const poAvailable = isPlayoffDataAvailable();
  const phase = resolvePhase(phaseParam, poAvailable);
  const ctx = { phase };
  const games = getGames(ctx);
  const dates = getGameDates(ctx);
  const drama = phase === "po" ? Object.fromEntries(getDramaScores()) : {};
  const series = phase === "po" ? getPlayoffSeries() : [];
  return <GamesClient key={phase} games={games} dates={dates} phase={phase} poAvailable={poAvailable} drama={drama} series={series} />;
}
