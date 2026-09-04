import { getStandings, getTeamAdvanced } from "@/lib/data/teams";
import { teamNameJa } from "@/lib/data/names-ja";
import { currentSeason } from "@/lib/season";
import { StandingsClient } from "./client";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `順位表 · ${phaseTitle("rs")}`,
  description: `${phaseTitle("rs")} の東西カンファレンス順位表。勝敗・勝率・ゲーム差に加え、ORtg・DRtg・NRtg・Pace を並べる。`,
  path: "/standings",
});


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
      // 日本語の正式名（plan §13-1 段階4）。略称はそのまま
      displayName: teamNameJa(abbr) ?? s.teamName,
      offRating: adv?.offRating ?? 0,
      defRating: adv?.defRating ?? 0,
      netRating: adv?.netRating ?? 0,
      pace: adv?.pace ?? 0,
    };
  });

  return <StandingsClient standings={enriched} season={currentSeason()} />;
}
