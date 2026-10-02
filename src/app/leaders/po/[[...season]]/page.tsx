import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderLeaders } from "../../leaders-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";
import { resolveSeason, seasonParams } from "@/lib/season";
import { seasonPath } from "@/lib/season-path";

// /leaders/po（今季）と /leaders/po/<過去季>（plan.md §13-10）
export const dynamicParams = false;
export const generateStaticParams = seasonParams;

type Props = { params: Promise<{ season?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = resolveSeason((await params).season);
  if (!r) return {};
  const title = phaseTitle("po", r.season);
  return pageMeta({
    title: `リーダーズ · ${title}`,
    description: `${title}。プレーオフの部門別リーダーと四象限マップ。`,
    path: seasonPath("/leaders/po", r.pastSeason),
    image: r.pastSeason ? `/og/seasons/${r.pastSeason}/leaders-po` : "/leaders/po/opengraph-image",
  });
}

export default async function Page({ params }: Props) {
  const r = resolveSeason((await params).season);
  if (!r) notFound();
  return renderLeaders("po", r.pastSeason);
}
