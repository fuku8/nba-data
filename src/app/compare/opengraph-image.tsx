import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Compare Players | NBA Data";

export default function Image() {
  return ogImage({ title: "Compare Players", subtitle: "Up to 4 players: stats, radar, scoring mix", kicker: seasonLabel("rs"), accent: "#3f3f46" });
}
