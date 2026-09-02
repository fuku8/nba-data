import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PreSeasonNotice } from "@/components/phase-switch";
import { HomeDashboard } from "@/app/home-dashboard";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: phaseTitle("po"),
  description: `${phaseTitle("po")} のトーナメント表とシリーズ結果、スタッツリーダー。`,
  path: "/playoffs",
});


// トップと同じダッシュボードを Playoffs タブで開く（plan.md §12-6）
export default function PlayoffsPage() {
  if (!isPlayoffDataAvailable()) return <PreSeasonNotice />;
  return <HomeDashboard defaultTab="po" />;
}
