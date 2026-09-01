import { getStandings, getTeamAdvanced, getTeamPerGame } from "@/lib/data/teams";
import { getPlayoffTeamStats, getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { resolvePhase } from "@/lib/phase";
import { TeamsClient } from "./client";
import { PlayoffTeamsClient } from "./po-teams-client";

export const revalidate = 3600;

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const { phase: phaseParam } = await searchParams;
  const poAvailable = isPlayoffDataAvailable();
  const phase = resolvePhase(phaseParam, poAvailable);
  if (phase === "po") {
    return <PlayoffTeamsClient teamStats={getPlayoffTeamStats()} series={getPlayoffSeries()} />;
  }

  const standings = getStandings();
  const advanced = getTeamAdvanced();
  const perGame = getTeamPerGame();

  const advMap = new Map(advanced.map((a) => [a.teamName, a]));
  const pgMap = new Map(perGame.map((p) => [p.teamName, p]));

  const teams = standings.map((s) => {
    const adv = advMap.get(s.teamName);
    const pg = pgMap.get(s.teamName);
    return {
      name: s.teamName,
      abbr: s.teamAbbr,
      conference: s.conference,
      wins: s.wins,
      losses: s.losses,
      winPct: s.winPct,
      pts: pg?.pts ?? 0,
      reb: pg?.reb ?? 0,
      ast: pg?.ast ?? 0,
      offRating: adv?.offRating ?? 0,
      defRating: adv?.defRating ?? 0,
      netRating: adv?.netRating ?? 0,
      pace: adv?.pace ?? 0,
    };
  });

  return <TeamsClient teams={teams} poAvailable={poAvailable} />;
}
