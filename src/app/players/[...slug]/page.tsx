import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/metadata";
import { getPlayerPerGame } from "@/lib/data/players";
import { getPlayoffPlayerPerGame } from "@/lib/data/playoffs";
import { renderPlayer, playerIdsOf } from "./player-page";
import { archivedSeasons, currentSeason } from "@/lib/season";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const [playerId, s] = slug;
  const season = s ?? currentSeason();
  const id = parseInt(playerId, 10);
  const rows = getPlayerPerGame({ season });
  const pg = rows.find((p) => p.playerId === id && p.team !== "TOT") ?? rows.find((p) => p.playerId === id);
  if (!pg) return {};
  const po = getPlayoffPlayerPerGame(season).some((p) => p.playerId === id);
  return pageMeta({
    title: `${pg.player} · NBA ${season}`,
    description: `${pg.player}（${pg.team}）の NBA ${season} スタッツ: ${pg.gp}試合 ${pg.pts.toFixed(1)} PTS / ${pg.trb.toFixed(1)} REB / ${pg.ast.toFixed(1)} AST。リーグ内パーセンタイル・レーダー・得点の作り方・ショットチャート${po ? "・プレーオフ成績" : ""}。`,
    path: s ? `/players/${playerId}/${s}` : `/players/${playerId}`,
    image: `/og/players/${[...slug].reverse().join("/")}`, // 順序は og/players/[...slug]/route.tsx 参照
  });
}

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
