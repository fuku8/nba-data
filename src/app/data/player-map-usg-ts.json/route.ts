import { getPlayerAdvanced } from "@/lib/data/players";
import { withDisplayNames } from "@/lib/data/names-ja";
import { MIN_GP } from "@/lib/data/player-types";
import { allSeasons } from "@/lib/season";
import type { QuadrantDot } from "@/components/quadrant-map";

// 選手ページ「使われ方 × 効率」マップの背景データ（全選手ページで共有。GP≥MIN_GP・TOT行なし・シーズン別）。
// ページに埋め込むと静的書き出しの HTML と RSC payload の両方に載り、583ページで約120MB増えるため
// 1ファイルを client で読む（検証: _ai_workspace/reports/2026-09-25-選手ページへの選手マップ掲載の検証.md）
export const dynamic = "force-static";

export function GET() {
  const body: Record<string, QuadrantDot[]> = {};
  for (const season of allSeasons()) {
    body[season] = withDisplayNames(getPlayerAdvanced({ season }).filter((p) => p.gp >= MIN_GP && p.team !== "TOT"))
      .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.usgPct, y: p.tsPct }));
  }
  return Response.json(body);
}
