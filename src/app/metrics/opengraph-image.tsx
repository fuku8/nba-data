import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";
export const alt = "Metrics Guide | スタッツのかたち";

export default function Image() {
  return ogImage({ title: "Metrics Guide", subtitle: "How percentiles, versatility and drama index are computed", accent: "#3f3f46" });
}
