import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { UsageEfficiencyMap } from "@/components/usage-efficiency-map";
import { LeadersClient } from "./client";

export const revalidate = 3600;

export default function LeadersPage() {
  const perGame = getPlayerPerGame().filter((p) => p.gp >= 30 && p.team !== "TOT");
  const advanced = getPlayerAdvanced().filter((p) => p.gp >= 30 && p.team !== "TOT");

  const dots = advanced
    .filter((p) => p.gp >= 40 && p.mp >= 25)
    .map((p) => ({ name: p.player, team: p.team, usg: p.usgPct, ts: p.tsPct }));

  return (
    <div className="space-y-6">
      <LeadersClient perGame={perGame} advanced={advanced} />
      <Card>
        <CardHeader>
          <CardTitle>USG% × TS% 四象限マップ</CardTitle>
          <p className="text-xs text-muted-foreground">
            攻撃をどれだけ背負い、どれだけ効率よく決めたか（GP40・MPG25以上の{dots.length}人 · 点線は中央値 · 点にホバーで選手名）
          </p>
        </CardHeader>
        <CardContent>
          <UsageEfficiencyMap dots={dots} />
        </CardContent>
      </Card>
    </div>
  );
}
