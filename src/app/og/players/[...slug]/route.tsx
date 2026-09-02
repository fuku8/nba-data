import { getPlayerPerGame } from "@/lib/data/players";
import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";
import { currentSeason } from "@/lib/season";
import { ogImage } from "@/lib/og";

// 選手ページは catch-all（/players/[id] と /players/[id]/[season] を1ルートで持つ）なので、その下に
// opengraph-image.tsx は置けない（Next の制約）。代わりに Route Handler で同じ画像を返し、pageMeta から URL を指す
export { generateStaticParams } from "@/app/players/[...slug]/page";
export const dynamicParams = false;
export const dynamic = "force-static";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const [playerId, s] = slug;
  const season = s ?? currentSeason();
  const id = parseInt(playerId, 10);
  const rows = getPlayerPerGame({ season });
  const pg = rows.find((p) => p.playerId === id && p.team !== "TOT") ?? rows.find((p) => p.playerId === id);
  if (!pg) return ogImage({ title: "Player", kicker: `NBA ${season}` });
  return ogImage({
    title: pg.player,
    subtitle: `${getTeamInfo(pg.team)?.name ?? pg.team} · ${pg.gp} GP · ${pg.mpg.toFixed(1)} MPG`,
    kicker: `NBA ${season}`,
    accent: getTeamColor(pg.team),
    stats: [
      { label: "PTS", value: pg.pts.toFixed(1) },
      { label: "REB", value: pg.trb.toFixed(1) },
      { label: "AST", value: pg.ast.toFixed(1) },
      { label: "FG%", value: pg.fgPct ? (pg.fgPct * 100).toFixed(1) : "-" },
      { label: "3P%", value: pg.threePtPct ? (pg.threePtPct * 100).toFixed(1) : "-" },
    ],
  });
}
