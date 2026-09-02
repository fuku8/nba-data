import { renderTeams } from "../teams-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `チーム · ${phaseTitle("po")}`,
  description: `${phaseTitle("po")}。プレーオフ出場チームのシリーズ勝敗と Per Game スタッツ。`,
  path: "/teams/po",
});


export default function Page() {
  return renderTeams("po");
}
