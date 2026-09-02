import { renderLeaders } from "../leaders-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `リーダーズ · ${phaseTitle("po")}`,
  description: `${phaseTitle("po")}。プレーオフの部門別リーダーと四象限マップ。`,
  path: "/leaders/po",
});


export default function Page() {
  return renderLeaders("po");
}
