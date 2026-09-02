import type { Metadata } from "next";
import { currentSeason, poYear } from "@/lib/season";
import { PHASE_LABEL, type Phase } from "@/lib/phase";

export const SITE_URL = "https://nba-data.pages.dev";
export const SITE_NAME = "NBA Data";

// ページごとの title / description / OG。title は layout の template で「… | NBA Data」になる
// ponytail: OG 画像は用意していない（og:image なし）。必要になったら public/og.png を置いて images に足す
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    // ルート layout と同じ階層の page（トップ）には template が効かないので、トップだけ絶対指定
    title: path === "/" ? { absolute: `${title} | ${SITE_NAME}` } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website", locale: "ja_JP" },
    twitter: { card: "summary", title, description },
  };
}

// "NBA 2025-26 Regular Season" / "NBA 2026 Playoffs"（見出しの SeasonTitle と同じ書式）
export function phaseTitle(phase: Phase, season = currentSeason()): string {
  return phase === "po" ? `NBA ${poYear(season)} ${PHASE_LABEL.po}` : `NBA ${season} ${PHASE_LABEL.rs}`;
}
