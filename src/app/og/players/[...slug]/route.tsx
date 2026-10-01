import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";
import { ogImage } from "@/lib/og";
import { playerNameJa } from "@/lib/data/names-ja";

// 選手ページは catch-all ルートなので、その下に opengraph-image.tsx は置けない（Next の制約）。
// 代わりに Route Handler で同じ画像を返し、pageMeta から URL を指す。URL は /og/players/<id>（選手ページと同じく1人1枚）
import { generateStaticParams } from "@/app/players/[...slug]/page";
import { latestSeasonOf } from "@/app/players/[...slug]/player-page";
export const dynamicParams = false;
export { generateStaticParams };
export const dynamic = "force-static";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const id = parseInt(slug[0], 10);
  // 選手ページの見出しと同じ季（成績のある最新の季）
  const latest = latestSeasonOf(id);
  if (!latest) return ogImage({ title: "Player", kicker: "NBA" });
  const { season, pg } = latest;
  // 日本語名主・英語名従（plan §13-1 段階2）。対応表に無い選手は英語名のみ
  const ja = playerNameJa(id);
  return ogImage({
    title: ja ?? pg.player,
    subtitle: `${ja ? `${pg.player} · ` : ""}${getTeamInfo(pg.team)?.name ?? pg.team} · ${pg.gp} GP · ${pg.mpg.toFixed(1)} MPG`,
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
