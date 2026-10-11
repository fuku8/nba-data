import { NBA_TEAMS } from "@/lib/constants/teams";
import { getStandings, getTeamAdvanced } from "@/lib/data/teams";
import { getLatestGameDate } from "@/lib/data/games";
import { getTeamAbbr } from "@/lib/constants/teams";
import { currentSeason } from "@/lib/season";
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export { generateStaticParams } from "./page";
export const dynamicParams = false;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Team page | スタッツのかたち";

export default async function Image({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const abbr = teamId.toUpperCase();
  const info = NBA_TEAMS[abbr];
  const st = getStandings().find((s) => s.teamAbbr === abbr);
  const adv = getTeamAdvanced().find((a) => getTeamAbbr(a.teamName) === abbr);
  const signed = (v: number) => (v > 0 ? "+" : "") + v.toFixed(1);
  return ogImage({
    title: info?.name ?? abbr,
    // 勝敗は画面の見出しと同じ「○勝○敗」。古い投稿に残っても asOf の日付で時点が分かる
    subtitle: st ? `${st.wins}勝${st.losses}敗 · ${info?.conference}ern Conference` : `${info?.conference}ern Conference`,
    kicker: `NBA ${currentSeason()}`,
    accent: info?.primaryColor,
    asOf: getLatestGameDate(),
    stats: adv ? [
      { label: "ORtg", value: adv.offRating.toFixed(1) },
      { label: "DRtg", value: adv.defRating.toFixed(1) },
      { label: "NRtg", value: signed(adv.netRating) },
      { label: "Pace", value: adv.pace.toFixed(1) },
    ] : [],
  });
}
