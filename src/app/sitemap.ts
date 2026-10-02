import type { MetadataRoute } from "next";

// 静的エクスポート（output: export）の要件
export const dynamic = "force-static";
import { SITE_URL } from "@/lib/metadata";
import { NBA_TEAMS } from "@/lib/constants/teams";
import { allPlayerIds } from "./players/[...slug]/player-page";
import { archivedSeasons } from "@/lib/season";

// 固定ページ・チーム・選手（1人1ページ。どの季かに成績がある全員）。試合詳細は数が多く内容も薄いので載せない（plan §13-2-3）
const FIXED = [
  "",
  "/standings",
  "/teams",
  "/teams/po",
  "/players",
  "/players/po",
  "/leaders",
  "/leaders/po",
  "/compare",
  "/compare/po",
  "/games",
  "/games/po",
  "/playoffs",
  "/types",
  "/metrics",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const teams = Object.keys(NBA_TEAMS).map((id) => `/teams/${id}`);
  const players = allPlayerIds().map((id) => `/players/${id}`);
  // 過去季に残すページ（plan.md §13-10）。シリーズ詳細は試合詳細と同じ理由で載せない
  const past = archivedSeasons().flatMap((s) => [`/standings/${s}`, `/leaders/${s}`, `/leaders/po/${s}`, `/playoffs/${s}`]);
  return [...FIXED, ...past, ...teams, ...players].map((path) => ({ url: `${SITE_URL}${path}` }));
}
