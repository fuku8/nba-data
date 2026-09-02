import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Standings & Stat Leaders | NBA Data";

export default function Image() {
  return ogImage({ title: "Standings & Stat Leaders", subtitle: "East / West standings and PTS / REB / AST leaders", kicker: seasonLabel("rs"), accent: "#3f3f46" });
}
