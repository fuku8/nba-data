import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 完全静的エクスポート（Cloudflare Pages で配信。plan.md §12-11）。
  // 旧 /playoffs/* → 新URL のリダイレクトは public/_redirects（Cloudflare 側）。
  // 本番ビルドだけ有効にする（kokkai-data と同じ。dev で有効にすると動的ルートが壊れる実測あり）
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  allowedDevOrigins: ["192.168.0.138"],
};

export default nextConfig;
