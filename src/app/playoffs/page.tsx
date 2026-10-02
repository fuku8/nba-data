import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PreSeasonNotice } from "@/components/phase-switch";
import { SeasonSwitch } from "@/components/season-switch";
import { currentSeason } from "@/lib/season";
import { HomeDashboard } from "@/app/home-dashboard";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: phaseTitle("po"),
  description: `${phaseTitle("po")} のトーナメント表とシリーズ結果、スタッツリーダー。`,
  path: "/playoffs",
});


// トップと同じダッシュボードを Playoffs タブで開く（plan.md §12-6）。過去季のブラケットは [...slug]/page.tsx
export default function PlayoffsPage() {
  // 今季の PO が始まる前でも、過去季のブラケットへは行けるように季の切替を出す
  if (!isPlayoffDataAvailable()) return <><SeasonSwitch season={currentSeason()} basePath="/playoffs" /><PreSeasonNotice /></>;
  return <HomeDashboard defaultTab="po" />;
}
