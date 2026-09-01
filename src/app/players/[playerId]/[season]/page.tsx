import { notFound } from "next/navigation";
import { renderPlayer, playerIdsOf } from "../player-page";
import { archivedSeasons } from "@/lib/season";

export const dynamicParams = false;

// 過去シーズン × その季に成績がある選手
// ponytail: 1選手あたり約9ファイル（html＋RSC txt＋セグメント7）出るので、過去季が3つを超えると Cloudflare Pages の20,000ファイル上限に当たる。
// そのときは対象をローテ選手（GP>=MIN_GP）に絞るか最古の季を落とす（plan.md §12-11）
export function generateStaticParams() {
  return archivedSeasons().flatMap((season) => playerIdsOf(season).map((id) => ({ playerId: String(id), season })));
}

export default async function Page({ params }: { params: Promise<{ playerId: string; season: string }> }) {
  const { playerId, season } = await params;
  if (!archivedSeasons().includes(season)) notFound();
  return renderPlayer(playerId, season);
}
