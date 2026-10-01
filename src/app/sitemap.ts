import type { MetadataRoute } from "next";

// 静的エクスポート（output: export）の要件
export const dynamic = "force-static";
import { SITE_URL } from "@/lib/metadata";
import { NBA_TEAMS } from "@/lib/constants/teams";
import { allPlayerIds } from "./players/[...slug]/player-page";

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
  return [...FIXED, ...teams, ...players].map((path) => ({ url: `${SITE_URL}${path}` }));
}
