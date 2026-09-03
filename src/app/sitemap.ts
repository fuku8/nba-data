import type { MetadataRoute } from "next";

// 静的エクスポート（output: export）の要件
export const dynamic = "force-static";
import { SITE_URL } from "@/lib/metadata";
import { NBA_TEAMS } from "@/lib/constants/teams";
import { archivedSeasons, currentSeason } from "@/lib/season";
import { playerIdsOf } from "./players/[...slug]/player-page";

// 固定ページ・チーム・選手（現季＋過去季）。試合詳細は数が多く内容も薄いので載せない（plan §13-2-3）
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
  const players = playerIdsOf(currentSeason()).map((id) => `/players/${id}`);
  const archived = archivedSeasons().flatMap((season) => playerIdsOf(season).map((id) => `/players/${id}/${season}`));
  return [...FIXED, ...teams, ...players, ...archived].map((path) => ({ url: `${SITE_URL}${path}` }));
}
