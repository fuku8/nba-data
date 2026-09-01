import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PreSeasonNotice } from "@/components/phase-switch";
import { HomeDashboard } from "@/app/home-dashboard";

// トップと同じダッシュボードを Playoffs タブで開く（plan.md §12-6）
export default function PlayoffsPage() {
  if (!isPlayoffDataAvailable()) return <PreSeasonNotice />;
  return <HomeDashboard defaultTab="po" />;
}
