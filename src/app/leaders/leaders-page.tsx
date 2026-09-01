import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PO_MIN_GP } from "@/lib/data/player-types";
import type { Phase } from "@/lib/phase";
import { PreSeasonNotice } from "@/components/phase-switch";
import { UsageEfficiencyMap } from "@/components/usage-efficiency-map";
import { MetricLink } from "@/components/metric-link";
import { LeadersClient } from "./client";

// リーダーズのGP下限（RS30・PO4）と四象限マップの下限（RS GP40・PO GP8。いずれもMPG25以上）
const LEADER_MIN_GP = { rs: 30, po: PO_MIN_GP } as const;
const MAP_MIN_GP = { rs: 40, po: 8 } as const;

// フェーズはパス区分（/leaders = RS, /leaders/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderLeaders(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const minGp = LEADER_MIN_GP[phase];
  const perGame = getPlayerPerGame({ phase }).filter((p) => p.gp >= minGp && p.team !== "TOT");
  const advanced = getPlayerAdvanced({ phase }).filter((p) => p.gp >= minGp && p.team !== "TOT");

  const dots = advanced
    .filter((p) => p.gp >= MAP_MIN_GP[phase] && p.mp >= 25)
    .map((p) => ({ name: p.player, team: p.team, usg: p.usgPct, ts: p.tsPct }));

  return (
    <div className="space-y-6">
      <LeadersClient key={phase} phase={phase} poAvailable={poAvailable} minGp={minGp} perGame={perGame} advanced={advanced} />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>USG% × TS% 四象限マップ</CardTitle>
            <MetricLink anchor="usg-ts" />
          </div>
          <p className="text-xs text-muted-foreground">
            攻撃をどれだけ背負い、どれだけ効率よく決めたか（GP{MAP_MIN_GP[phase]}・MPG25以上の{dots.length}人 · 点線は中央値 · 点にホバーで選手名）
          </p>
        </CardHeader>
        <CardContent>
          <UsageEfficiencyMap dots={dots} />
        </CardContent>
      </Card>
    </div>
  );
}
