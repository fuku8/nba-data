import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE, PO_ORANGE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Teams | NBA Data";

export default function Image() {
  return ogImage({ title: "Teams", subtitle: "Playoff teams: series W-L and per-game stats", kicker: seasonLabel("po"), accent: PO_ORANGE });
}
