import { renderCompare } from "./compare-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `選手比較 · ${phaseTitle("rs")}`,
  description: `${phaseTitle("rs")}。選手を最大4名選んで、比較表・レーダーチャート・得点の作り方を並べる。`,
  path: "/compare",
});


export default function Page() {
  return renderCompare("rs");
}
