import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.138"],
  // RS/PO統合（plan.md §12-2）で移動した旧URL。src/app/playoffs/ 配下の対応ページは削除待ち
  async redirects() {
    return [
      { source: "/playoffs/players", destination: "/players?phase=po", permanent: true },
      { source: "/playoffs/leaders", destination: "/leaders?phase=po", permanent: true },
      { source: "/playoffs/compare", destination: "/compare?phase=po", permanent: true },
      { source: "/playoffs/games", destination: "/games?phase=po", permanent: true },
      { source: "/playoffs/games/:gameId", destination: "/games/:gameId", permanent: true },
      { source: "/playoffs/teams", destination: "/teams?phase=po", permanent: true },
      { source: "/playoffs/teams/:teamId", destination: "/teams/:teamId", permanent: true },
    ];
  },
};

export default nextConfig;
