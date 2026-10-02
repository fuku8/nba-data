import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStandings, getTeamAdvanced } from "@/lib/data/teams";
import { teamNameJa } from "@/lib/data/names-ja";
import { resolveSeason, seasonParams } from "@/lib/season";
import { seasonPath } from "@/lib/season-path";
import { SeasonSwitch } from "@/components/season-switch";
import { StandingsClient } from "../client";
import { pageMeta, phaseTitle } from "@/lib/metadata";

// /standings（今季）と /standings/<過去季>（plan.md §13-10）
export const dynamicParams = false;
export const generateStaticParams = seasonParams;

type Props = { params: Promise<{ season?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = resolveSeason((await params).season);
  if (!r) return {};
  const title = phaseTitle("rs", r.season);
  return pageMeta({
    title: `順位表 · ${title}`,
    description: `${title} の東西カンファレンス順位表。勝敗・勝率・ゲーム差に加え、ORtg・DRtg・NRtg・Pace を並べる。`,
    path: seasonPath("/standings", r.pastSeason),
    // catch-all の下の page は親セグメントの opengraph-image.tsx を引き継がないので、URL を渡す
    image: r.pastSeason ? `/og/seasons/${r.pastSeason}/standings` : "/standings/opengraph-image",
  });
}

export default async function StandingsPage({ params }: Props) {
  const r = resolveSeason((await params).season);
  if (!r) notFound();
  const { season, pastSeason } = r;
  const standings = getStandings(season);
  const advanced = getTeamAdvanced(season);

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

  return (
    <StandingsClient
      standings={enriched}
      season={season}
      pastSeason={pastSeason}
      seasonSwitch={<SeasonSwitch season={season} basePath="/standings" />}
    />
  );
}
