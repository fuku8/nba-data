import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/metadata";
import { getPlayoffPlayerPerGame } from "@/lib/data/playoffs";
import { renderPlayer, allPlayerIds, latestSeasonOf, currentTeamOf } from "./player-page";
import { playerNameJa } from "@/lib/data/names-ja";
import { currentSeason } from "@/lib/season";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const [playerId] = slug;
  const id = parseInt(playerId, 10);
  // ページは常に今季が入口。成績は、今季に出場が無ければ成績のある最新の季のものを説明文に載せる
  const latest = latestSeasonOf(id);
  if (!latest) return {};
  const { season, pg } = latest;
  const cur = currentSeason();
  // 所属は画面の見出しと同じ決め方（名簿優先）。所属なしなら説明文にチームを書かない
  const team = currentTeamOf(id, season === cur ? pg.team : null);
  const who = [pg.player, team].filter(Boolean).join("・");
  const po = getPlayoffPlayerPerGame(season).some((p) => p.playerId === id);
  // 日本語名を主・英語名を従の併記（plan §13-1 段階1。検索流入用で、画面表示は変えない）
  const ja = playerNameJa(id);
  return pageMeta({
    title: `${ja ? `${ja}（${pg.player}）` : pg.player} · NBA ${cur}`,
    description: `${ja ? `${ja}（${who}）` : team ? `${pg.player}（${team}）` : pg.player}の ${season === cur ? "" : `NBA ${cur} は出場なし。`}NBA ${season} スタッツ: ${pg.gp}試合 ${pg.pts.toFixed(1)} PTS / ${pg.trb.toFixed(1)} REB / ${pg.ast.toFixed(1)} AST。リーグ内パーセンタイル・レーダー・得点の作り方・ショットチャート${po ? "・プレーオフ成績" : ""}。`,
    path: `/players/${playerId}`,
    image: `/og/players/${playerId}`,
  });
}

// 選手1人＝1ページ（/players/[id]）。季ごとの URL は持たず、過去季はページ内のタブで見る（plan.md §13-10）。
// どの季かに成績がある選手を全員出すので、今季まだ出場が無い選手のページも残る。
// ルートが catch-all のままなのは、以前の /players/[id]/[season] からディレクトリ名を変えないため（2階層目は 404）
export function generateStaticParams() {
  return allPlayerIds().map((id) => ({ slug: [String(id)] }));
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  if (slug.length !== 1) notFound();
  return renderPlayer(slug[0]);
}
