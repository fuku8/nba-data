import { getStandings, getTeamAdvanced, getTeamPerGame } from "@/lib/data/teams";
import { getPlayoffTeamStats, getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import type { Phase } from "@/lib/phase";
import { currentSeason } from "@/lib/season";
import { PreSeasonNotice } from "@/components/phase-switch";
import { TeamsClient } from "./client";
import { PlayoffTeamsClient } from "./po-teams-client";

// フェーズはパス区分（/teams = RS, /teams/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderTeams(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  if (phase === "po") {
    return <PlayoffTeamsClient teamStats={getPlayoffTeamStats()} series={getPlayoffSeries()} season={currentSeason()} />;
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

  return <TeamsClient teams={teams} poAvailable={poAvailable} season={currentSeason()} />;
}
