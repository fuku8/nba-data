import { renderPlayers } from "../players-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `選手一覧 · ${phaseTitle("po")}`,
  description: `${phaseTitle("po")}。プレーオフ出場選手の Per Game・Advanced スタッツ一覧と散布図。`,
  path: "/players/po",
});


export default function Page() {
  return renderPlayers("po");
}
