import { renderCompare } from "../compare-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `選手比較 · ${phaseTitle("po")}`,
  description: `${phaseTitle("po")}。プレーオフのスタッツで選手を比較する。`,
  path: "/compare/po",
});


export default function Page() {
  return renderCompare("po");
}
