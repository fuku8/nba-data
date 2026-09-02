import { renderTeams } from "./teams-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `チーム一覧 · ${phaseTitle("rs")}`,
  description: `${phaseTitle("rs")}。30チームの勝敗・勝率と PTS/REB/AST、ORtg・DRtg・NRtg の一覧。並べ替え可。`,
  path: "/teams",
});


export default function Page() {
  return renderTeams("rs");
}
