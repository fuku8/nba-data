import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals } from "@/lib/data/players";
import { withDisplayNames, withFullNames } from "@/lib/data/names-ja";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { PO_MIN_GP } from "@/lib/data/player-types";
import type { Phase } from "@/lib/phase";
import { PreSeasonNotice, PhaseSwitch } from "@/components/phase-switch";
import { QuadrantMap, MAP_HELP, type QuadrantDot, type AxisFormat } from "@/components/quadrant-map";
import { MetricLink } from "@/components/metric-link";
import { LeadersClient } from "./client";
import { TOP_N } from "./constants";
import { SeasonTitle } from "@/components/season-title";
import { currentSeason } from "@/lib/season";
import { PHASE_LABEL } from "@/lib/phase";
import { getLatestGameDate } from "@/lib/data/games";
import { getPoLastGameDate } from "@/lib/data/csv-utils";
import { ChartFrame } from "@/components/chart-frame";

// リーダーズのGP下限（RS30・PO4）
const LEADER_MIN_GP = { rs: 30, po: PO_MIN_GP } as const;

// 図はこのページのリストにあるスタッツだけで組む（USG%・TS% は Efficiency、STL・BLK は Basic）
function MapCard({
  title,
  anchor,
  lead,
  scope,
  context,
  asOf,
  dots,
  ...map
}: {
  title: string;
  anchor: string;
  lead: string;
  scope: string;
  context: string;
  asOf?: string;
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
          {lead}（{scope}の{dots.length}人 · 点線は中央値 · {MAP_HELP}）
        </p>
      </CardHeader>
      <CardContent>
        <ChartFrame title={title} context={context} asOf={asOf}>
          <QuadrantMap dots={dots} labelTop={5} {...map} />
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

// フェーズはパス区分（/leaders = RS, /leaders/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderLeaders(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const minGp = LEADER_MIN_GP[phase];
  // リストはフル日本語名、図ラベルだけ短縮名（略称→カタカナ姓）に収める（plan §13-1 段階3）
  const perGameRaw = getPlayerPerGame({ phase }).filter((p) => p.gp >= minGp && p.team !== "TOT");
  const advancedRaw = getPlayerAdvanced({ phase }).filter((p) => p.gp >= minGp && p.team !== "TOT");
  const perGame = withFullNames(perGameRaw);
  const advanced = withFullNames(advancedRaw);

  // 図の対象＝そのリストの上位20人の和集合（図に載る人＝リストに載っている人）
  // MPG等で切ると少出場のスペシャリスト（スティール上位のサイブル等）がリストに居るのに図から消える
  const topKeys = <T extends { playerId: number; team: string }>(rows: T[], value: (p: T) => number) =>
    [...rows].sort((a, b) => value(b) - value(a)).slice(0, TOP_N).map((p) => `${p.playerId}-${p.team}`);

  const usageKeys = new Set([...topKeys(advancedRaw, (p) => p.usgPct), ...topKeys(advancedRaw, (p) => p.tsPct)]);
  const usageDots = withDisplayNames(advancedRaw.filter((p) => usageKeys.has(`${p.playerId}-${p.team}`)))
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.usgPct, y: p.tsPct }));

  // 対象はリスト（per-game 小数1桁）で選び、座標は totals/GP で計算する（小数1桁だと同一座標に重なるため）
  const defenseKeys = new Set([...topKeys(perGameRaw, (p) => p.stl), ...topKeys(perGameRaw, (p) => p.blk)]);
  const totals = new Map(getPlayerTotals({ phase }).map((t) => [`${t.playerId}-${t.team}`, t]));
  const defenseDots = withDisplayNames(perGameRaw.filter((p) => defenseKeys.has(`${p.playerId}-${p.team}`))).flatMap((p) => {
    const t = totals.get(`${p.playerId}-${p.team}`);
    return t && t.gp > 0 ? [{ playerId: p.playerId, name: p.player, team: p.team, x: t.stl / t.gp, y: t.blk / t.gp }] : [];
  });

  // 拡大モーダルの文脈行とデータ反映日（リーダーズは常に現行シーズン。PO の図には PO 最終戦日）
  const mapContext = `${PHASE_LABEL[phase]} ${currentSeason()}`;
  const asOf = phase === "po" ? getPoLastGameDate() : getLatestGameDate();

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
          scope={`USG%・TS% 各上位${TOP_N}`}
          context={mapContext}
          asOf={asOf}
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
          scope={`STL・BLK 各上位${TOP_N}`}
          context={mapContext}
          asOf={asOf}
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
