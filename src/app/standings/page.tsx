import { getStandings, getTeamAdvanced } from "@/lib/data/teams";
import { StandingsClient } from "./client";

export const revalidate = 3600;

export default function StandingsPage() {
  const standings = getStandings();
  const advanced = getTeamAdvanced();

  const advancedMap = new Map(advanced.map((a) => [a.teamName, a]));

  const enriched = standings.map((s) => {
    const abbr = s.teamAbbr;
    const adv = advancedMap.get(s.teamName);
    return {
      ...s,
      abbr,
      offRating: adv?.offRating ?? 0,
      defRating: adv?.defRating ?? 0,
      netRating: adv?.netRating ?? 0,
      pace: adv?.pace ?? 0,
    };
  });

  return <StandingsClient standings={enriched} />;
}
