import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Games | NBA Data";

export default function Image() {
  return ogImage({ title: "Games", subtitle: "Results by date", kicker: seasonLabel("rs"), accent: "#3f3f46" });
}
