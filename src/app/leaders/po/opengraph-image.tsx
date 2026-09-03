import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE, PO_ORANGE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "League Leaders | スタッツのかたち";

export default function Image() {
  return ogImage({ title: "League Leaders", subtitle: "Playoff category leaders and maps", kicker: seasonLabel("po"), accent: PO_ORANGE });
}
