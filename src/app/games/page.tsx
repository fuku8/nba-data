import { renderGames } from "./games-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `試合結果 · ${phaseTitle("rs")}`,
  description: `${phaseTitle("rs")}。日付ごとの試合結果。NBA.com の試合詳細へのリンク付き。`,
  path: "/games",
});


export default function Page() {
  return renderGames("rs");
}
