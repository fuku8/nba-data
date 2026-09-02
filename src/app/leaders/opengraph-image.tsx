import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "League Leaders | NBA Data";

export default function Image() {
  return ogImage({ title: "League Leaders", subtitle: "Category leaders, USG% x TS% and STL x BLK maps", kicker: seasonLabel("rs"), accent: "#3f3f46" });
}
