import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Teams | スタッツのかたち";

export default function Image() {
  return ogImage({ title: "Teams", subtitle: "30 teams: W-L, PTS / REB / AST, ratings", kicker: seasonLabel("rs"), accent: "#3f3f46" });
}
