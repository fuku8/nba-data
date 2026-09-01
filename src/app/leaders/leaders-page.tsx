import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals } from "@/lib/data/players";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PO_MIN_GP } from "@/lib/data/player-types";
import type { Phase } from "@/lib/phase";
import { PreSeasonNotice, PhaseSwitch } from "@/components/phase-switch";
import { QuadrantMap, type QuadrantDot, type AxisFormat } from "@/components/quadrant-map";
import { MetricLink } from "@/components/metric-link";
import { LeadersClient } from "./client";
import { SeasonTitle } from "@/components/season-title";
import { currentSeason } from "@/lib/season";

// リーダーズのGP下限（RS30・PO4）と四象限マップの下限（RS GP40・PO GP8。いずれもMPG25以上）
const LEADER_MIN_GP = { rs: 30, po: PO_MIN_GP } as const;
const MAP_MIN_GP = { rs: 40, po: 8 } as const;

// 図はこのページのリストにあるスタッツだけで組む（USG%・TS% は Efficiency、STL・BLK は Basic）
function MapCard({
  title,
  anchor,
  lead,
  minGp,
  dots,
  ...map
}: {
  title: string;
  anchor: string;
  lead: string;
  minGp: number;
  dots: QuadrantDot[];
  xLabel: string;
  yLabel: string;
  xFormat: AxisFormat;
  yFormat: AxisFormat;
  quadrantLabels: [string, string, string, string];
  clipTop?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <MetricLink anchor={anchor} />
        </div>
        <p className="text-xs text-muted-foreground">
          {lead}（GP{minGp}・MPG25以上の{dots.length}人 · 点線は中央値 · 点にホバーで選手名・クリックで固定）
        </p>
      </CardHeader>
      <CardContent>
        <QuadrantMap dots={dots} labelTop={5} {...map} />
      </CardContent>
    </Card>
  );
}

// フェーズはパス区分（/leaders = RS, /leaders/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderLeaders(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const minGp = LEADER_MIN_GP[phase];
  const perGame = getPlayerPerGame({ phase }).filter((p) => p.gp >= minGp && p.team !== "TOT");
  const advanced = getPlayerAdvanced({ phase }).filter((p) => p.gp >= minGp && p.team !== "TOT");

  const mapPlayers = advanced.filter((p) => p.gp >= MAP_MIN_GP[phase] && p.mp >= 25);
  const usageDots = mapPlayers.map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.usgPct, y: p.tsPct }));

  // STL/BLK は per-game の小数1桁だと座標が重なる（RS156人中58点が先の点に隠れる）ので totals/GP で計算する
  const totals = new Map(getPlayerTotals({ phase }).map((t) => [`${t.playerId}-${t.team}`, t]));
  const defenseDots = mapPlayers.flatMap((p) => {
    const t = totals.get(`${p.playerId}-${p.team}`);
    return t && t.gp > 0 ? [{ playerId: p.playerId, name: p.player, team: p.team, x: t.stl / t.gp, y: t.blk / t.gp }] : [];
  });

  return (
    <div className="space-y-6">
      {/* 見出しは図の上に置く（他ページと同じ並び。RS｜PO 切替も最上部に） */}
      <div>
        <SeasonTitle season={currentSeason()} phase={phase} />
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">League Leaders</h1>
          <PhaseSwitch phase={phase} poAvailable={poAvailable} basePath="/leaders" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MapCard
          title="USG% × TS% 四象限マップ"
          anchor="usg-ts"
          lead="攻撃をどれだけ背負い、どれだけ効率よく決めたか"
          minGp={MAP_MIN_GP[phase]}
          dots={usageDots}
          xLabel="USG%"
          yLabel="TS%"
          xFormat="pct"
          yFormat="pct"
          quadrantLabels={["重労働 × 高効率", "省エネ × 高効率", "重労働 × 低効率", "省エネ × 低効率"]}
        />
        <MapCard
          title="STL × BLK 守備マップ"
          anchor="stl-blk"
          lead="外で奪う（スティール）か、中で止める（ブロック）か"
          minGp={MAP_MIN_GP[phase]}
          dots={defenseDots}
          xLabel="STL"
          yLabel="BLK"
          xFormat="1f"
          yFormat="1f"
          quadrantLabels={["奪って止める", "リムを守る", "外で奪う", "静かな守備"]}
          clipTop={1}
        />
      </div>
      <LeadersClient key={phase} minGp={minGp} perGame={perGame} advanced={advanced} />
    </div>
  );
}
