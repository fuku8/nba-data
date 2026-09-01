import { notFound } from "next/navigation";
import { renderPlayer, playerIdsOf } from "./player-page";
import { archivedSeasons, currentSeason } from "@/lib/season";

export const dynamicParams = false;

// /players/[id]（現シーズン）と /players/[id]/[season]（過去シーズン）を1ルートで持つ。
// 2階層に分けると過去シーズンが無い間 generateStaticParams が空になり、静的エクスポートがビルドできないため（plan.md §12-11）
// ponytail: 1選手あたり約9ファイル出るので、過去季が3つを超えると Cloudflare Pages の20,000ファイル上限に当たる。
// そのときは過去季をローテ選手（GP>=MIN_GP）に絞るか最古の季を落とす
export function generateStaticParams() {
  const current = playerIdsOf(currentSeason()).map((id) => ({ slug: [String(id)] }));
  const archived = archivedSeasons().flatMap((season) => playerIdsOf(season).map((id) => ({ slug: [String(id), season] })));
  return [...current, ...archived];
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const [playerId, season] = slug;
  if (slug.length > 2 || (season && !archivedSeasons().includes(season))) notFound();
  return renderPlayer(playerId, season ?? currentSeason());
}
