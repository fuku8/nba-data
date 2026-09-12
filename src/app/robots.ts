import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

// 静的エクスポート（output: export）の要件
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
