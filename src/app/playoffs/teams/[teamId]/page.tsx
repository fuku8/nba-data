import { permanentRedirect } from "next/navigation";
import { NBA_TEAMS } from "@/lib/constants/teams";

export function generateStaticParams() {
  return Object.keys(NBA_TEAMS).map((teamId) => ({ teamId }));
}

// 旧URL。RS/PO統合（plan.md §12-2）でチーム詳細ページ内のプレーオフ節に移動
export default async function LegacyPlayoffTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  permanentRedirect(`/teams/${teamId.toUpperCase()}`);
}
