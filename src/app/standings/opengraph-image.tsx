import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Standings | スタッツのかたち";

export default function Image() {
  return ogImage({ title: "Standings", subtitle: "W-L, Win%, GB, ORtg / DRtg / NRtg / Pace", kicker: seasonLabel("rs"), accent: "#3f3f46" });
}
