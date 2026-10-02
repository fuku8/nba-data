import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderLeaders } from "../leaders-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";
import { resolveSeason, seasonParams } from "@/lib/season";
import { seasonPath } from "@/lib/season-path";

// /leaders（今季）と /leaders/<過去季>（plan.md §13-10）
export const dynamicParams = false;
export const generateStaticParams = seasonParams;

type Props = { params: Promise<{ season?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = resolveSeason((await params).season);
  if (!r) return {};
  const title = phaseTitle("rs", r.season);
  return pageMeta({
    title: `リーダーズ · ${title}`,
    description: `${title}。得点・リバウンド・アシストなど部門別リーダーと、USG%×TS%・STL×BLK の四象限マップ。`,
    path: seasonPath("/leaders", r.pastSeason),
    // catch-all の下の page は親セグメントの opengraph-image.tsx を引き継がないので、URL を渡す
    image: r.pastSeason ? `/og/seasons/${r.pastSeason}/leaders` : "/leaders/opengraph-image",
  });
}

export default async function Page({ params }: Props) {
  const r = resolveSeason((await params).season);
  if (!r) notFound();
  return renderLeaders("rs", r.pastSeason);
}
