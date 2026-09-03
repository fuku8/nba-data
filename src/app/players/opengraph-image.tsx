import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Players | スタッツのかたち";

export default function Image() {
  return ogImage({ title: "Players", subtitle: "Per game & advanced stats, USG% x TS% map", kicker: seasonLabel("rs"), accent: "#3f3f46" });
}
