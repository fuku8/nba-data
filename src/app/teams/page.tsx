import { getStandings, getTeamAdvanced, getTeamPerGame } from "@/lib/data/teams";
import { getTeamAbbr } from "@/lib/constants/teams";
import { TeamsClient } from "./client";

export const revalidate = 3600;

export default function TeamsPage() {
  const standings = getStandings();
  const advanced = getTeamAdvanced();
  const perGame = getTeamPerGame();

  const advMap = new Map(advanced.map((a) => [a.team, a]));
  const pgMap = new Map(perGame.map((p) => [p.team, p]));

  const teams = standings.map((s) => {
    const adv = advMap.get(s.team);
    const pg = pgMap.get(s.team);
    return {
      name: s.team,
      abbr: getTeamAbbr(s.team),
      conference: s.conference,
      wins: s.wins,
      losses: s.losses,
      winPct: s.winPct,
      pts: pg?.pts ?? 0,
      reb: pg?.trb ?? 0,
      ast: pg?.ast ?? 0,
      offRating: adv?.offRating ?? 0,
      defRating: adv?.defRating ?? 0,
      netRating: adv?.netRating ?? 0,
      pace: adv?.pace ?? 0,
    };
  });

  return <TeamsClient teams={teams} />;
}
