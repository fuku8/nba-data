import fs from "fs";
import path from "path";
import { currentSeason, seasonDir } from "@/lib/season";
import { getTeamColor } from "@/lib/constants/teams";
import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE, PO_ORANGE } from "@/lib/og";

export { generateStaticParams } from "./page";
export const dynamicParams = false;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Box score | NBA Data";

type Team = { tricode: string; score: number; wins: number; losses: number; isHome: boolean };

export default async function Image({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const p = path.join(seasonDir(currentSeason()), "boxscores", `${gameId}.json`);
  const box = fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf-8")) as { teams: Team[]; gameTimeUTC?: string }) : null;
  const away = box?.teams.find((t) => !t.isHome);
  const home = box?.teams.find((t) => t.isHome);
  if (!box || !away || !home) return ogImage({ title: "Box Score", kicker: seasonLabel("po"), accent: PO_ORANGE });
  const date = box.gameTimeUTC ? new Date(box.gameTimeUTC).toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric" }) : "";
  const winner = away.score > home.score ? away.tricode : home.tricode;
  return ogImage({
    title: `${away.tricode} ${away.score} - ${home.score} ${home.tricode}`,
    subtitle: `${date} · ${away.tricode} @ ${home.tricode} · Final`,
    kicker: seasonLabel("po"),
    accent: getTeamColor(winner),
    stats: [
      { label: away.tricode, value: `${away.wins}-${away.losses}` },
      { label: home.tricode, value: `${home.wins}-${home.losses}` },
    ],
  });
}
