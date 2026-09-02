import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Player Types | NBA Data";

export default function Image() {
  return ogImage({ title: "Player Types", subtitle: "7 style-based player types and rankings", kicker: "NBA Data", accent: "#3f3f46" });
}
