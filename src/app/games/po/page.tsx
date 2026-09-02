import { renderGames } from "../games-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `試合結果 · ${phaseTitle("po")}`,
  description: `${phaseTitle("po")}。プレーオフの試合結果と熱戦指数、ボックススコア。`,
  path: "/games/po",
});


export default function Page() {
  return renderGames("po");
}
