"use client";

// 選手ページの「使われ方 × 効率」マップ: 背景＝GP≥MIN_GP の全選手（共有 JSON を client で読む）、当該選手を強調。
// チームページの地形図（league-terrain highlight）と同じ見せ方。段階2（シューターマップ）は該当者のみ追加予定
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartFrame } from "@/components/chart-frame";
import { MetricLink } from "@/components/metric-link";
import { QuadrantMap, MAP_HELP, type QuadrantDot } from "@/components/quadrant-map";

export function PlayerUsageMap({
  playerId,
  team,
  season,
  minGp,
  context,
  frame,
}: {
  playerId: number;
  team: string;
  season: string;
  minGp: number;
  context: string;
  frame: { name: string; team: string; asOf?: string };
}) {
  const [dots, setDots] = useState<QuadrantDot[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/data/player-map-usg-ts.json")
      .then((r) => r.json())
      .then((j: Record<string, QuadrantDot[]>) => { if (alive) setDots(j[season] ?? []); })
      .catch(() => { if (alive) setDots([]); });
    return () => { alive = false; };
  }, [season]);

  const me = `${playerId}-${team}`;
  // 母集団に居ない（移籍先での GP がまだ少ない等）ときは図を出さない
  if (dots && !dots.some((d) => `${d.playerId}-${d.team}` === me)) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>使われ方 × 効率</CardTitle>
          <MetricLink anchor="usg-ts" />
        </div>
        <p className="text-xs text-muted-foreground">
          USG%（攻撃をどれだけ背負うか）× TS%（得点効率）・GP{minGp}以上の{dots ? `${dots.length}人` : "選手"}の中での位置・点線は中央値 · {MAP_HELP}
        </p>
      </CardHeader>
      <CardContent>
        {dots ? (
          <ChartFrame title="使われ方 × 効率" context={context} name={frame.name} team={frame.team} asOf={frame.asOf}>
            {/* 他選手の名前は常時出さない（ホバー・タップで出るため。2026-09-25 指示）。当該選手の名前と値の箱だけ */}
            <QuadrantMap dots={dots} highlight={me} xLabel="USG%" yLabel="TS%" xFormat="pct" yFormat="pct" />
          </ChartFrame>
        ) : (
          <div className="aspect-[640/420] w-full" aria-hidden />
        )}
      </CardContent>
    </Card>
  );
}
