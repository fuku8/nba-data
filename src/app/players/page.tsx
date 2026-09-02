import { renderPlayers } from "./players-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `選手一覧 · ${phaseTitle("rs")}`,
  description: `${phaseTitle("rs")}。選手の Per Game・Advanced スタッツ一覧と、USG%×TS%・シューターの散布図。名前で検索、並べ替え可。`,
  path: "/players",
});


export default function Page() {
  return renderPlayers("rs");
}
