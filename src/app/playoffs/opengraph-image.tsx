import { ogImage, seasonLabel, OG_SIZE, OG_CONTENT_TYPE, PO_ORANGE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Playoff Bracket | NBA Data";

export default function Image() {
  return ogImage({ title: "Playoff Bracket", subtitle: "Series results and stat leaders", kicker: seasonLabel("po"), accent: PO_ORANGE });
}
