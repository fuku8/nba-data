import type { Metadata } from "next";
import { currentSeason, poYear } from "@/lib/season";
import { PHASE_LABEL, type Phase } from "@/lib/phase";

export const SITE_URL = "https://nba-data.pages.dev";
export const SITE_NAME = "スタッツのかたち";
// OG 画像内の表記（画像は英数字のみで描く決定のため。og.tsx のコメント参照）
export const SITE_NAME_EN = "Stats no Katachi";

// ページごとの title / description / OG。title は layout の template で「… | スタッツのかたち」になる
export function pageMeta({ title, description, path, image }: { title: string; description: string; path: string; image?: string }): Metadata {
  return {
    // ルート layout と同じ階層の page（トップ）には template が効かないので、トップだけ絶対指定
    title: path === "/" ? { absolute: `${title} | ${SITE_NAME}` } : title,
    description,
    alternates: { canonical: path },
    // 画像は各セグメントの opengraph-image.tsx が自動で付く。catch-all 配下（選手）だけ Route Handler の URL を渡す
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website", locale: "ja_JP", ...(image ? { images: [image] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
  };
}

// "NBA 2025-26 Regular Season" / "NBA 2026 Playoffs"（見出しの SeasonTitle と同じ書式）
export function phaseTitle(phase: Phase, season = currentSeason()): string {
  return phase === "po" ? `NBA ${poYear(season)} ${PHASE_LABEL.po}` : `NBA ${season} ${PHASE_LABEL.rs}`;
}
