import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerProfile, getPlayerTotals, currentTeam, rosterTeamMap } from "@/lib/data/players";
import { getPlayoffPlayerPerGame, getPlayoffPlayerAdvanced, getPlayoffPlayerTotals } from "@/lib/data/playoffs";
import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";
import { PercentileBars, percentileOf, type PercentileRow } from "@/components/percentile-bars";
import { VersatilityRadar, versatilityScore } from "@/components/versatility-radar";
import { ScoringWaffle } from "@/components/scoring-waffle";
import { ShotChart } from "@/components/shot-chart";
import { getPlayerShots, type Shot } from "@/lib/data/shots";
import { getPlayerHustle, getPlayoffPlayerHustle, getPlayerSpeed, getPlayoffPlayerSpeed, getPlayerPossessions, getPlayoffPlayerPossessions, type PlayerHustle, type PlayerSpeed, type PlayerPossessions } from "@/lib/data/tracking";
import { MetricLink } from "@/components/metric-link";
import { getPlayerTypes, getPoSwing, rsMinGp, PO_MIN_GP, type TypeBadge, type PoSwing } from "@/lib/data/player-types";
import { getSimilarPlayers } from "@/lib/data/similar";
import { allSeasons, currentSeason, poYear } from "@/lib/season";
import { getLatestGameDate } from "@/lib/data/games";
import { getPoLastGameDate } from "@/lib/data/csv-utils";
import { ChartFrame } from "@/components/chart-frame";
import { SeasonTitle } from "@/components/season-title";
import { PhaseTabsList } from "@/components/phase-switch";
import { PlayerUsageMap } from "@/components/player-usage-map";
import { playerNameJa, teamNameJa } from "@/lib/data/names-ja";
import { PhaseCompareBars, RS_COLOR, PO_COLOR } from "@/components/phase-compare-bars";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HashTabs } from "@/components/hash-tabs";
import { ChevronRight } from "lucide-react";

function fmtHeight(h: string): string {
  const [ft, inch] = h.split("-").map(Number);
  if (isNaN(ft) || isNaN(inch)) return h;
  return `${Math.round((ft * 12 + inch) * 2.54)} cm`;
}

function fmtWeight(w: string): string {
  const lbs = parseFloat(w);
  if (isNaN(lbs)) return w;
  return `${Math.round(lbs * 0.453592)} kg`;
}

const fmtPct = (v: number | undefined | null) => (v != null && v !== 0) ? (v * 100).toFixed(1) + "%" : "-";

// パーセンタイル・レーダー・ワッフルを「Playoffs / Regular Season」の期間別グループで表示する
function VisualGroup({
  title,
  accent = false,
  pctNote,
  pctRows,
  radarItems,
  vScore,
  pts3,
  pts2,
  ptsFt,
  ptsAvg,
  shots,
  hustleItems,
  motion,
  badges,
  swing,
  season,
  frame,
  usageMap,
}: {
  title: string;
  season: string;
  accent?: boolean;
  pctNote: string;
  pctRows: PercentileRow[] | null;
  radarItems: { label: string; pct: number }[] | null;
  vScore: number | null;
  pts3: number;
  pts2: number;
  ptsFt: number;
  ptsAvg: number;
  shots: Shot[];
  hustleItems: { label: string; pct: number }[] | null;
  motion: { distKm: number; marathons: number; items: PercentileRow[]; score: number } | null;
  badges: TypeBadge[] | null;
  swing: PoSwing | null;
  frame: { name: string; team: string; asOf?: string };
  /** 「使われ方 × 効率」マップ（RS のみ・League Percentile と同じ GP 下限を満たすとき） */
  usageMap?: { playerId: number; team: string } | null;
}) {
  const hasWaffle = pts3 + pts2 + ptsFt > 0;
  const hasShots = shots.length > 0;
  // 縁の下の力持ち度 = ハッスル6部門パーセンタイルの単純平均
  const hustleScore = hustleItems ? hustleItems.reduce((a, r) => a + r.pct, 0) / hustleItems.length : null;
  if (!pctRows && !radarItems && !hasWaffle && !hasShots && !hustleItems && !motion) return null;
  // 表示丸め後の値でラベルを判定（表示と分類が矛盾しないように）。±2.0ptちょうどは平常（誤差扱い）
  // `|| 0` で丸め後の -0 を +0 に正規化（"-0.0pt" 表示を防ぐ）
  const swingPt = swing ? Math.round(swing.delta * 1000) / 10 || 0 : 0;
  const swingDir = swingPt > 2 ? 1 : swingPt < -2 ? -1 : 0; // ±2.0ptちょうどは平常（誤差扱い）
  const swingLabel = swingDir > 0 ? "昇温" : swingDir < 0 ? "降温" : "平常";
  const swingCls = swingDir > 0 ? "text-emerald-400 border-emerald-400/40" : swingDir < 0 ? "text-rose-400 border-rose-400/40" : "text-muted-foreground";
  return (
    <section className="space-y-4">
      <h2 className={`text-lg font-semibold ${accent ? "text-orange-400" : ""}`}>{title}</h2>
      {((badges && badges.length > 0) || swing) && (
        <div className="space-y-2">
          {badges && badges.length > 0 && (
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">プレイヤータイプ</h3>
              <MetricLink anchor="player-type" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
          {badges?.map((b) => (
            <span
              key={b.type}
              className={`inline-flex items-baseline gap-2 rounded-full border bg-secondary/60 px-4 py-1.5 text-base ${b.fallback ? "opacity-60" : "font-bold"}`}
            >
              {b.type}{b.fallback ? " (参考)" : ""}
              <span className="font-mono text-sm font-semibold text-muted-foreground">{(b.score * 100).toFixed(1)}</span>
            </span>
          ))}
          {swing && (
            <>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${swingCls}`}>
                {poYear(season)} PO {swingLabel}
                <span className="font-mono font-semibold">
                  {swingPt > 0 ? "+" : ""}{swingPt.toFixed(1)}pt
                </span>
              </span>
              <MetricLink anchor="po-swing" />
            </>
          )}
          </div>
        </div>
      )}
      {/* 位置の図2枚: 使われ方×効率（2次元・全体像）→ League Percentile（1次元・部門別）の順で PC は横並び。
          マップを全幅に置くと高さ930pxで他の図の4倍の面積になり主役に見えるため（2026-09-25 指摘）。
          マップが左なのは「図から見せる」＋背の低い Percentile を右に置いた方が収まりがよいため（同日指示） */}
      {pctRows && (
        <div className={`grid gap-6 ${usageMap ? "lg:grid-cols-2" : ""}`}>
          {usageMap && (
            <PlayerUsageMap playerId={usageMap.playerId} team={usageMap.team} season={season} minGp={rsMinGp(season)} context={title} frame={frame} />
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>League Percentile</CardTitle>
                <MetricLink anchor="percentile" />
              </div>
              <p className="text-xs text-muted-foreground">{pctNote}</p>
            </CardHeader>
            <CardContent>
              <ChartFrame title="League Percentile" context={title} name={frame.name} team={frame.team} asOf={frame.asOf}>
                <PercentileBars rows={pctRows} />
              </ChartFrame>
            </CardContent>
          </Card>
        </div>
      )}
      {(radarItems || hasWaffle || hasShots || hustleItems || motion) && (
        <div className="grid gap-6 md:grid-cols-2">
          {hasShots && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>ショットチャート</CardTitle>
                  <MetricLink anchor="shot-chart" />
                </div>
                <p className="text-xs text-muted-foreground">全試投の位置（緑=成功 / 灰=失敗）</p>
              </CardHeader>
              <CardContent>
                <ChartFrame title="ショットチャート" context={title} name={frame.name} team={frame.team} asOf={frame.asOf}>
                  <div className="flex justify-center">
                    <ShotChart shots={shots} />
                  </div>
                </ChartFrame>
              </CardContent>
            </Card>
          )}
          {radarItems && vScore != null && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>オールラウンド度 {(vScore * 100).toFixed(1)}</CardTitle>
                  <MetricLink anchor="versatility" />
                </div>
                <p className="text-xs text-muted-foreground">5部門パーセンタイルの平均×均等さ</p>
              </CardHeader>
              <CardContent>
                <ChartFrame
                  title={`オールラウンド度 ${(vScore * 100).toFixed(1)}`}
                  context={title}
                  name={frame.name}
                  team={frame.team}
                  asOf={frame.asOf}
                >
                  <div className="flex justify-center">
                    <VersatilityRadar items={radarItems} />
                  </div>
                </ChartFrame>
              </CardContent>
            </Card>
          )}
          {hasWaffle && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>得点の作り方</CardTitle>
                  <MetricLink anchor="scoring-mix" />
                </div>
                <p className="text-xs text-muted-foreground">平均{ptsAvg.toFixed(1)}点の内訳（1マス=1%）</p>
              </CardHeader>
              <CardContent>
                <ChartFrame title="得点の作り方" context={title} name={frame.name} team={frame.team} asOf={frame.asOf}>
                  <ScoringWaffle pts3={pts3} pts2={pts2} ptsFt={ptsFt} />
                </ChartFrame>
              </CardContent>
            </Card>
          )}
          {hustleItems && hustleScore != null && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>縁の下の力持ち度 {(hustleScore * 100).toFixed(1)}</CardTitle>
                  <MetricLink anchor="hustle" />
                </div>
                <p className="text-xs text-muted-foreground">ハッスル6部門パーセンタイルの平均（スタッツに出ない貢献）</p>
              </CardHeader>
              <CardContent>
                <ChartFrame
                  title={`縁の下の力持ち度 ${(hustleScore * 100).toFixed(1)}`}
                  context={title}
                  name={frame.name}
                  team={frame.team}
                  asOf={frame.asOf}
                >
                  <div className="flex justify-center">
                    <VersatilityRadar items={hustleItems} />
                  </div>
                </ChartFrame>
              </CardContent>
            </Card>
          )}
          {motion && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>運動量 {(motion.score * 100).toFixed(1)}</CardTitle>
                  <MetricLink anchor="motion" />
                </div>
                <p className="text-xs text-muted-foreground">
                  各項目のリーグ内評点（0-100）。総合スコアは役割に左右されにくい走行距離/試合と平均速度のみの平均
                </p>
              </CardHeader>
              <CardContent>
                <ChartFrame
                  title={`運動量 ${(motion.score * 100).toFixed(1)}`}
                  context={title}
                  name={frame.name}
                  team={frame.team}
                  asOf={frame.asOf}
                >
                  <div className="space-y-3">
                    <PercentileBars rows={motion.items} />
                    <p className="text-xs text-muted-foreground">
                      合計走行距離 {motion.distKm.toFixed(1)}km = フルマラソン{motion.marathons.toFixed(1)}本分
                    </p>
                  </div>
                </ChartFrame>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

// 指定シーズンに RS か PO の成績がある選手ID（generateStaticParams 用）
// RS vs PO: 同じ選手の「リーグ内の位置」を並べる。生の数値は出場時間と相手の強さで必ずずれるので比べない
function CompareGroup({
  minGp,
  poGp,
  pctRows,
  poPctRows,
  radarItems,
  poRadarItems,
  vScore,
  poVScore,
  scoring,
  poScoring,
  hustleItems,
  poHustleItems,
  motion,
  poMotion,
}: {
  minGp: number;
  poGp: number;
  pctRows: PercentileRow[];
  poPctRows: PercentileRow[];
  radarItems: { label: string; pct: number }[] | null;
  poRadarItems: { label: string; pct: number }[] | null;
  vScore: number | null;
  poVScore: number | null;
  scoring: { pts3: number; pts2: number; ptsFt: number; ptsAvg: number };
  poScoring: { pts3: number; pts2: number; ptsFt: number; ptsAvg: number };
  hustleItems: { label: string; pct: number }[] | null;
  poHustleItems: { label: string; pct: number }[] | null;
  motion: { items: PercentileRow[]; score: number } | null;
  poMotion: { items: PercentileRow[]; score: number } | null;
}) {
  const legend = (
    <span className="text-xs text-muted-foreground">
      <span className="font-semibold" style={{ color: RS_COLOR }}>灰=RS</span> · <span className="font-semibold" style={{ color: PO_COLOR }}>橙=PO</span>
    </span>
  );
  const arrow = (a: number | null, b: number | null) =>
    a != null && b != null ? `${(a * 100).toFixed(1)} → ${(b * 100).toFixed(1)}` : "";
  const hasScoring = scoring.pts3 + scoring.pts2 + scoring.ptsFt > 0 && poScoring.pts3 + poScoring.pts2 + poScoring.ptsFt > 0;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">RS vs PO</h2>
      <p className="text-xs text-muted-foreground">
        値はいずれもリーグ内の位置（100が最上位）。RS はGP{minGp}以上の選手内、PO はGP{PO_MIN_GP}以上のPO出場選手内で、母集団が違う。
        この選手の PO は{poGp}試合{poGp < 8 ? "（試合数が少なく値は荒れやすい）" : ""}。
      </p>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>League Percentile</CardTitle>
            <MetricLink anchor="percentile" />
          </div>
        </CardHeader>
        <CardContent>
          <PhaseCompareBars rs={pctRows} po={poPctRows} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {radarItems && poRadarItems && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>オールラウンド度 {arrow(vScore, poVScore)}</CardTitle>
                <MetricLink anchor="versatility" />
              </div>
              {legend}
            </CardHeader>
            <CardContent className="flex justify-center">
              <VersatilityRadar items={poRadarItems} base={radarItems} />
            </CardContent>
          </Card>
        )}
        {hasScoring && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>得点の作り方</CardTitle>
                <MetricLink anchor="scoring-mix" />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {[{ tag: "RS", color: RS_COLOR, v: scoring }, { tag: "PO", color: PO_COLOR, v: poScoring }].map(({ tag, color, v }) => (
                <div key={tag} className="space-y-2">
                  <div className="text-sm font-semibold" style={{ color }}>{tag} <span className="font-mono text-muted-foreground">{v.ptsAvg.toFixed(1)} PTS</span></div>
                  <ScoringWaffle pts3={v.pts3} pts2={v.pts2} ptsFt={v.ptsFt} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {hustleItems && poHustleItems && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>縁の下の力持ち度 {arrow(hustleItems.reduce((a, r) => a + r.pct, 0) / hustleItems.length, poHustleItems.reduce((a, r) => a + r.pct, 0) / poHustleItems.length)}</CardTitle>
                <MetricLink anchor="hustle" />
              </div>
              {legend}
            </CardHeader>
            <CardContent className="flex justify-center">
              <VersatilityRadar items={poHustleItems} base={hustleItems} />
            </CardContent>
          </Card>
        )}
        {motion && poMotion && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>運動量 {arrow(motion.score, poMotion.score)}</CardTitle>
                <MetricLink anchor="motion" />
              </div>
            </CardHeader>
            <CardContent>
              <PhaseCompareBars rs={motion.items} po={poMotion.items} />
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

// どの季かに RS 成績がある全選手ID。選手ページは選手1人＝1ページで、季ごとの URL は持たない（plan.md §13-10）。
// ponytail: ページは RS 行を前提に組む（見出し・チーム・図）ので、生成対象も RS に揃える。PO にしか成績が無い選手は
// 対象外（2025-26 には居ない。Codex レビュー 2026-10-01 指摘: PO も数えると生成されるのに 404 になる）。
// 出たら buildSeason を PO 行だけでも組めるようにする
export function allPlayerIds(): number[] {
  return [...new Set(allSeasons().flatMap((season) => getPlayerPerGame({ season }).map((p) => p.playerId)))];
}

// 選手ページの現在の所属チーム（見出し・メタデータ共通）。チームページのロスターと同じ currentTeam() だけで決める
// （名簿が空のときだけ別の決め方をすると、選手ページとロスターが食い違う。Codex レビュー 2026-10-01）
export function currentTeamOf(playerId: number, fallback: string | null): string | null {
  return currentTeam(rosterTeamMap(), playerId, fallback);
}

// 成績（RS）のある最新の季とその行。見出し・メタデータ・OG 画像が同じ季を指すように共通化
export function latestSeasonOf(playerId: number) {
  for (const season of allSeasons()) {
    const rows = getPlayerPerGame({ season });
    const pg = rows.find((p) => p.playerId === playerId && p.team !== "TOT") ?? rows.find((p) => p.playerId === playerId);
    if (pg) return { season, pg };
  }
  return null;
}

// 1シーズン分の集計と図表（RS｜PO｜比較タブ＋Advanced Stats）。その季に RS 成績が無い選手は null
function buildSeason(playerIdNum: number, season: string, nameJa: string | undefined) {
  const ctx = { season };
  // RS の GP 下限。現季の序盤だけ下がる（リーグ最多GPの半分・最低5。plan.md §12-4）
  const minGp = rsMinGp(season);

  const allPerGame = getPlayerPerGame(ctx);
  const allAdvanced = getPlayerAdvanced(ctx);
  const allPoPerGame = getPlayoffPlayerPerGame(season);
  const allPoAdvanced = getPlayoffPlayerAdvanced(season);

  const pg = allPerGame.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPerGame.find((p) => p.playerId === playerIdNum);
  const adv = allAdvanced.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allAdvanced.find((p) => p.playerId === playerIdNum);
  const poPg = allPoPerGame.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPoPerGame.find((p) => p.playerId === playerIdNum);
  const poAdv = allPoAdvanced.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPoAdvanced.find((p) => p.playerId === playerIdNum);

  if (!pg) return null;

  // リーグ内パーセンタイル（母集団: 1選手1行。トレード選手はTOT行=フルシーズンを採用）
  // GP下限はRS=20/82試合、PO=4試合（1シリーズ弱）で母集団を回転選手に絞る（player-types.tsと共通）
  const poEligible = poPg != null && poPg.gp >= PO_MIN_GP;
  type PgRow = typeof allPerGame[number];
  type AdvRow = typeof allAdvanced[number];
  const dedupe = <T extends { playerId: number; team: string; gp: number }>(all: T[], minGp: number) => {
    const byId = new Map<number, T>();
    for (const p of all) {
      if (p.team === "TOT" || !byId.has(p.playerId)) byId.set(p.playerId, p);
    }
    return [...byId.values()].filter((p) => p.gp >= minGp);
  };
  const RADAR_LABELS = ["得点", "リバウンド", "アシスト", "スティール", "ブロック"];
  const buildPctRows = (
    pgRow: PgRow,
    advRow: AdvRow | undefined,
    pgPool: PgRow[],
    advPool: AdvRow[],
  ): PercentileRow[] => [
    { label: "得点", display: pgRow.pts.toFixed(1), pct: percentileOf(pgPool.map((p) => p.pts), pgRow.pts) },
    { label: "リバウンド", display: pgRow.trb.toFixed(1), pct: percentileOf(pgPool.map((p) => p.trb), pgRow.trb) },
    { label: "アシスト", display: pgRow.ast.toFixed(1), pct: percentileOf(pgPool.map((p) => p.ast), pgRow.ast) },
    { label: "スティール", display: pgRow.stl.toFixed(1), pct: percentileOf(pgPool.map((p) => p.stl), pgRow.stl) },
    { label: "ブロック", display: pgRow.blk.toFixed(1), pct: percentileOf(pgPool.map((p) => p.blk), pgRow.blk) },
    ...(advRow
      ? [
          { label: "TS%", display: (advRow.tsPct * 100).toFixed(1), pct: percentileOf(advPool.map((p) => p.tsPct), advRow.tsPct) },
          { label: "PIE", display: (advRow.pie * 100).toFixed(1), pct: percentileOf(advPool.map((p) => p.pie), advRow.pie) },
        ]
      : []),
    { label: "TOV(少なさ)", display: pgRow.tov.toFixed(1), pct: 1 - percentileOf(pgPool.map((p) => p.tov), pgRow.tov) },
  ];

  const pgFull = allPerGame.find((p) => p.playerId === playerIdNum && p.team === "TOT") ?? pg;
  const advFull = allAdvanced.find((p) => p.playerId === playerIdNum && p.team === "TOT") ?? adv;
  const pctRows = pgFull.gp >= minGp
    ? buildPctRows(pgFull, advFull, dedupe(allPerGame, minGp), dedupe(allAdvanced, minGp))
    : null;
  const poPctRows = poEligible
    ? buildPctRows(poPg, poAdv, dedupe(allPoPerGame, PO_MIN_GP), dedupe(allPoAdvanced, PO_MIN_GP))
    : null;
  // RS vs PO タブ: 両方のパーセンタイルが出せる選手だけ
  const canCompare = pctRows != null && poPctRows != null;

  // レーダー: League Percentileの5部門値をラベルで明示的に抽出（行順への位置依存を避ける）
  const extractRadar = (rows: PercentileRow[] | null) => {
    const raw = rows?.filter((r) => RADAR_LABELS.includes(r.label)) ?? null;
    return raw && raw.length === RADAR_LABELS.length ? raw : null;
  };
  const radarItems = extractRadar(pctRows);
  const vScore = radarItems ? versatilityScore(radarItems.map((r) => r.pct)) : null;
  const poRadarItems = extractRadar(poPctRows);
  const poVScore = poRadarItems ? versatilityScore(poRadarItems.map((r) => r.pct)) : null;
  // 得点構成: 3P/2P/FT由来の得点（per game）。整数の生値（totals）から算出し丸め誤差を避ける
  // FG3M*3 + (FGM-FG3M)*2 + FTM = PTS が厳密に成立する
  const allTotals = getPlayerTotals(ctx);
  const t = allTotals.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    ?? allTotals.find((p) => p.playerId === playerIdNum);
  const pts3 = t ? (t.threePt * 3) / t.gp : pg.threePt * 3;
  const pts2 = t ? ((t.fg - t.threePt) * 2) / t.gp : (pg.fg - pg.threePt) * 2;
  const ptsFt = t ? t.ft / t.gp : pg.ft;
  // PO版ワッフル（パーセンタイルと同じGP4以上を条件に。少試合のノイズ表示を防ぐ）
  const allPoTotals = poEligible ? getPlayoffPlayerTotals(season) : [];
  const poT = allPoTotals.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    ?? allPoTotals.find((p) => p.playerId === playerIdNum);
  const poPts3 = poT ? (poT.threePt * 3) / poT.gp : 0;
  const poPts2 = poT ? ((poT.fg - poT.threePt) * 2) / poT.gp : 0;
  const poPtsFt = poT ? poT.ft / poT.gp : 0;
  // 選手タイプ＋PO昇温（Phase 5）
  const rsBadges = getPlayerTypes("rs", season).get(playerIdNum)?.badges ?? null;
  const poBadges = poEligible ? getPlayerTypes("po", season).get(playerIdNum)?.badges ?? null : null;
  const poSwing = getPoSwing(season).get(playerIdNum) ?? null;

  // ショットチャート（Phase 3・ローカル一括取得したdata/shots/があるときのみ表示）
  const shots = getPlayerShots(playerIdNum, season);
  const rsShots = shots?.rs ?? [];
  const poShots = poEligible ? shots?.po ?? [] : [];

  // ハッスルレーダー（Phase 4）: パーセンタイル母集団はハッスル計測試合数Gで絞る
  const HUSTLE_ITEMS: { label: string; get: (h: PlayerHustle) => number }[] = [
    { label: "コンテスト", get: (h) => h.contestedShots },
    { label: "ディフレクション", get: (h) => h.deflections },
    { label: "チャージ", get: (h) => h.chargesDrawn },
    { label: "スクリーンAST", get: (h) => h.screenAssists },
    { label: "ルーズボール", get: (h) => h.looseBalls },
    { label: "ボックスアウト", get: (h) => h.boxOuts },
  ];
  const buildHustle = (all: PlayerHustle[], minGp: number) => {
    const row = all.find((h) => h.playerId === playerIdNum);
    if (!row || row.gp < minGp) return null;
    const pool = all.filter((h) => h.gp >= minGp);
    return HUSTLE_ITEMS.map(({ label, get }) => ({
      label,
      pct: percentileOf(pool.map(get), get(row)),
    }));
  };
  const hustleItems = buildHustle(getPlayerHustle(ctx), minGp);
  const poHustleItems = poEligible ? buildHustle(getPlayoffPlayerHustle(season), PO_MIN_GP) : null;

  // 運動量（Phase 4・RS/PO）。スコアは走行距離/試合と平均速度のパーセンタイル平均。
  // タッチ・保持時間は役割（ハンドラーかどうか）で大きく変わるためスコアには含めず、項目別評点のみ表示する
  const MILE_KM = 1.609344;
  const MARATHON_KM = 42.195;
  const buildMotion = (speedAll: PlayerSpeed[], possAll: PlayerPossessions[], minGp: number) => {
    const speed = speedAll.find((p) => p.playerId === playerIdNum);
    const poss = possAll.find((p) => p.playerId === playerIdNum);
    if (!speed || !poss || speed.distMiles <= 0 || speed.gp < minGp) return null;
    const pool = speedAll.filter((p) => p.gp >= minGp && p.distMiles > 0);
    const possPool = possAll.filter((p) => p.gp >= minGp);
    const distPerGame = (p: PlayerSpeed) => p.distMiles / p.gp;
    const distPct = percentileOf(pool.map(distPerGame), distPerGame(speed));
    const speedPct = percentileOf(pool.map((p) => p.avgSpeed), speed.avgSpeed);
    const items: PercentileRow[] = [
      { label: "走行距離/試合", display: `${(distPerGame(speed) * MILE_KM).toFixed(2)}km`, pct: distPct },
      { label: "平均速度", display: `${(speed.avgSpeed * MILE_KM).toFixed(1)}km/h`, pct: speedPct },
      { label: "タッチ/試合", display: `${poss.touches.toFixed(1)}回`, pct: percentileOf(possPool.map((p) => p.touches), poss.touches) },
      { label: "保持時間/試合", display: `${poss.timeOfPoss.toFixed(1)}分`, pct: percentileOf(possPool.map((p) => p.timeOfPoss), poss.timeOfPoss) },
    ];
    return {
      distKm: speed.distMiles * MILE_KM,
      marathons: (speed.distMiles * MILE_KM) / MARATHON_KM,
      items,
      score: (distPct + speedPct) / 2,
    };
  };
  const motion = buildMotion(getPlayerSpeed(ctx), getPlayerPossessions(ctx), minGp);
  const poMotion = poEligible ? buildMotion(getPlayoffPlayerSpeed(season), getPlayoffPlayerPossessions(season), PO_MIN_GP) : null;

  // 似たタイプの選手: スタッツのユークリッド距離が近い3名へのリンク
  const similarIds = getSimilarPlayers(playerIdNum, 3, ctx);

  // 拡大・画像保存の枠に渡す文脈（データ反映日は現行シーズンのみ。過去季は凍結データなので出さない。
  // PO の図には PO 最終戦日。getPoLastGameDate は PO データが無ければ空を返し、空なら表示されない）
  const isCurrent = season === currentSeason();
  const frame = {
    name: nameJa ?? pg.player,
    team: pg.team,
    ...(isCurrent ? { asOf: getLatestGameDate() } : {}),
  };
  const poFrame = { ...frame, ...(isCurrent ? { asOf: getPoLastGameDate() } : {}) };

  // ビジュアル: トップ・チーム詳細と同じ RS｜PO タブ（既定 RS）。PO の図が出せない（GP不足・未出場）ときはタブなしで RS だけ
  const visuals = poEligible ? (
        <Tabs defaultValue="rs" className="gap-6">
          <PhaseTabsList compare={canCompare} />
          <TabsContent value="rs">
            <VisualGroup
              frame={frame}
              title={`Regular Season ${season}`}
              season={season}
              pctNote={`GP${minGp}以上の選手内での位置（100が最上位）`}
              pctRows={pctRows}
              usageMap={pctRows ? { playerId: playerIdNum, team: pg.team } : null}
              radarItems={radarItems}
              vScore={vScore}
              pts3={pts3}
              pts2={pts2}
              ptsFt={ptsFt}
              ptsAvg={pg.pts}
              shots={rsShots}
              hustleItems={hustleItems}
              motion={motion}
              badges={rsBadges}
              swing={null}
            />
          </TabsContent>
          <TabsContent value="po">
            <VisualGroup
              frame={poFrame}
              title={`Playoffs ${poYear(season)}`}
              season={season}
              accent
              pctNote={`GP${PO_MIN_GP}以上のPO出場選手内での位置（100が最上位）`}
              pctRows={poPctRows}
              radarItems={poRadarItems}
              vScore={poVScore}
              pts3={poPts3}
              pts2={poPts2}
              ptsFt={poPtsFt}
              ptsAvg={poPg?.pts ?? 0}
              shots={poShots}
              hustleItems={poHustleItems}
              motion={poMotion}
              badges={poBadges}
              swing={poSwing}
            />
          </TabsContent>
          {canCompare && (
            <TabsContent value="compare">
              <CompareGroup
                minGp={minGp}
                poGp={poPg!.gp}
                pctRows={pctRows!}
                poPctRows={poPctRows!}
                radarItems={radarItems}
                poRadarItems={poRadarItems}
                vScore={vScore}
                poVScore={poVScore}
                scoring={{ pts3, pts2, ptsFt, ptsAvg: pg.pts }}
                poScoring={{ pts3: poPts3, pts2: poPts2, ptsFt: poPtsFt, ptsAvg: poPg!.pts }}
                hustleItems={hustleItems}
                poHustleItems={poHustleItems}
                motion={motion}
                poMotion={poMotion}
              />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <VisualGroup
          frame={frame}
          title={`Regular Season ${season}`}
          season={season}
          pctNote={`GP${minGp}以上の選手内での位置（100が最上位）`}
          pctRows={pctRows}
          usageMap={pctRows ? { playerId: playerIdNum, team: pg.team } : null}
          radarItems={radarItems}
          vScore={vScore}
          pts3={pts3}
          pts2={pts2}
          ptsFt={ptsFt}
          ptsAvg={pg.pts}
          shots={rsShots}
          hustleItems={hustleItems}
          motion={motion}
          badges={rsBadges}
          swing={null}
        />
      );

  const advanced = (adv || poAdv) && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                {adv && (
              <div>
                {poAdv && <div className="text-xs font-medium text-muted-foreground mb-2">Regular Season</div>}
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
                  {[
                    { label: "ORtg", value: adv.offRating.toFixed(1) },
                    { label: "DRtg", value: adv.defRating.toFixed(1) },
                    { label: "NRtg", value: (adv.netRating > 0 ? "+" : "") + adv.netRating.toFixed(1) },
                    { label: "TS%", value: (adv.tsPct * 100).toFixed(1) + "%" },
                    { label: "eFG%", value: (adv.efgPct * 100).toFixed(1) + "%" },
                    { label: "USG%", value: (adv.usgPct * 100).toFixed(1) + "%" },
                    { label: "AST%", value: (adv.astPct * 100).toFixed(1) + "%" },
                    { label: "REB%", value: (adv.rebPct * 100).toFixed(1) + "%" },
                    { label: "PIE", value: (adv.pie * 100).toFixed(1) + "%" },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-lg font-mono font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
                {poAdv && (
              <div>
                <div className="text-xs font-medium text-orange-400 mb-2">Playoffs</div>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
                  {[
                    { label: "ORtg", value: poAdv.offRating.toFixed(1) },
                    { label: "DRtg", value: poAdv.defRating.toFixed(1) },
                    { label: "NRtg", value: (poAdv.netRating > 0 ? "+" : "") + poAdv.netRating.toFixed(1) },
                    { label: "TS%", value: (poAdv.tsPct * 100).toFixed(1) + "%" },
                    { label: "eFG%", value: (poAdv.efgPct * 100).toFixed(1) + "%" },
                    { label: "USG%", value: (poAdv.usgPct * 100).toFixed(1) + "%" },
                    { label: "AST%", value: (poAdv.astPct * 100).toFixed(1) + "%" },
                    { label: "REB%", value: (poAdv.rebPct * 100).toFixed(1) + "%" },
                    { label: "PIE", value: (poAdv.pie * 100).toFixed(1) + "%" },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-lg font-mono font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );

  return {
    season,
    pg,
    poPg,
    similarIds,
    node: (
      <div className="space-y-6">
        {visuals}
        {advanced}
      </div>
    ),
  };
}

// 選手主体の1ページ（plan.md §13-10）。見出しと既定表示は常に今季で、図表は季のタブで切り替える。
// 今季まだ出場が無い選手・リーグを去った選手も、このページが残る（季ごとの URL にすると、繰越直後に
// /players/[id] の大半が 404 になる）。その場合の今季は成績0の行と「出場なし」で、図は出さない。過去季の図は
// その季のタブを選んだときだけ出す（入口は過去季の出場が無いルーキー等と同じにする。2026-10-01 ふくたろう指示）
// ponytail: 過去季の図表は RSC ペイロードに全季ぶん載る（HTML 本体は表示中のタブだけ）。2季ぶんの実測で
// 1季あたり中央値約90KB・最大約135KB 増（2026-10-01。中央値 338KB・最大 705KB）。Googlebot が読む HTML の上限は
// 非圧縮 2MB なので、試投の多い選手は過去季10前後で届く。そのときはショットチャートの点を短いパス
// （M x,y h0＋丸い線端）にするか、過去季を JSON で遅延読み込みにする
export async function renderPlayer(playerId: string) {
  const playerIdNum = parseInt(playerId, 10);
  if (isNaN(playerIdNum)) notFound();
  const nameJa = playerNameJa(playerIdNum);

  const views = allSeasons()
    .map((s) => buildSeason(playerIdNum, s, nameJa))
    .filter((v): v is NonNullable<typeof v> => v != null);
  if (views.length === 0) notFound();
  const cur = currentSeason();
  // views[0] は成績のある最新の季。今季に出場があれば今季、無ければ過去季（チーム・名前の表示に使う）
  const hasCurrent = views[0].season === cur;
  const { season, pg, poPg, similarIds } = views[0];
  // プロフィールは選手単位の情報なので、現季（累積ファイル）→過去季スナップショットの順で最初に見つかったものを使う
  const profile = allSeasons().map((s) => getPlayerProfile(playerIdNum, s)).find((p) => p != null);
  // 所属は名簿（出場が無くても分かる）から出す。成績行のチームは最後に出場したチームなので、移籍して未出場の
  // 選手が旧チームのままになり、チームのロスターと食い違う（2026-10-01 ふくたろう指摘）。名簿に居なければ
  // 「所属なし（最後に成績のある季 そのチーム）」
  const team = currentTeamOf(playerIdNum, hasCurrent ? pg.team : null) ?? null;
  const teamInfo = team ? getTeamInfo(team) : undefined;

  // スタッツ表: 最新の季を表示し、それより前の季は畳む。各季とも RS 行→PO 行の順（図のタブの既定 RS と揃える）。
  // キャリア通算行は持たない（plan.md §13-10 作業指示3）
  const rowsOf = (v: (typeof views)[number]) => [
    { key: `${v.season}-rs`, label: `${v.season} Regular Season`, row: v.pg, accent: false },
    ...(v.poPg ? [{ key: `${v.season}-po`, label: `${v.season} Playoffs`, row: v.poPg, accent: true }] : []),
  ];
  const pastRows = (hasCurrent ? views.slice(1) : views).flatMap(rowsOf);
  // チーム列: その季に出場したチーム。季ごとに所属が違うことが表の中で分かるようにする（2026-10-01 指示）
  const teamCell = (abbr: string | null) => (
    <td className="py-2 px-3 whitespace-nowrap font-mono">
      {abbr ? (
        <span className="inline-flex items-center gap-1.5" title={teamNameJa(abbr) ?? abbr}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getTeamColor(abbr) }} />
          {abbr}
        </span>
      ) : "-"}
    </td>
  );
  const statRow = (r: ReturnType<typeof rowsOf>[number]) => (
    <tr key={r.key} className="border-b last:border-0">
      <td className={`py-2 pr-4 whitespace-nowrap ${r.accent ? "font-semibold text-orange-400" : "font-medium text-muted-foreground"}`}>{r.label}</td>
      {teamCell(r.row.team)}
      <td className="py-2 px-3 text-center font-mono">{r.row.gp}</td>
      <td className="py-2 px-3 text-center font-mono font-semibold">{r.row.pts.toFixed(1)}</td>
      <td className="py-2 px-3 text-center font-mono">{r.row.trb.toFixed(1)}</td>
      <td className="py-2 px-3 text-center font-mono">{r.row.ast.toFixed(1)}</td>
      <td className="py-2 px-3 text-center font-mono">{r.row.stl.toFixed(1)}</td>
      <td className="py-2 px-3 text-center font-mono">{r.row.blk.toFixed(1)}</td>
      <td className="py-2 px-3 text-center font-mono">{r.row.tov.toFixed(1)}</td>
      <td className="py-2 px-3 text-center font-mono">{fmtPct(r.row.fgPct)}</td>
      <td className="py-2 px-3 text-center font-mono">{fmtPct(r.row.threePtPct)}</td>
      <td className="py-2 px-3 text-center font-mono">{fmtPct(r.row.ftPct)}</td>
      <td className="py-2 px-3 text-center font-mono">{r.row.mpg.toFixed(1)}</td>
    </tr>
  );

  // 図表のタブ: 今季の出場が無ければ、先頭に「出場なし」の今季を置く
  const tabs = [
    ...(hasCurrent ? [] : [{
      season: cur,
      node: (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {cur} は出場なし（図表はありません）
        </p>
      ),
    }]),
    ...views.map((v) => ({ season: v.season, node: v.node })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <SeasonTitle season={cur} />
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
          style={{ backgroundColor: getTeamColor(team ?? pg.team) }}
        >
          {pg.player.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          {/* 日本語名主・英語名従（plan §13-1 段階2）。対応表に無い選手は英語名のみ */}
          <h1 className="text-3xl font-bold tracking-tight">{nameJa ?? pg.player}</h1>
          {nameJa && <p className="text-sm text-muted-foreground">{pg.player}</p>}
          <div className="flex items-center gap-2 text-muted-foreground">
            {team ? (
              <Link href={`/teams/${team}`} className="hover:underline flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(team) }} />
                {teamNameJa(team) ?? teamInfo?.name ?? team}
              </Link>
            ) : (
              <span>所属なし（{season} {teamNameJa(pg.team) ?? pg.team}）</span>
            )}
            {/* 年齢は成績行の値なので、今季の行があるときだけ出す（過去季の年齢を今の年齢として出さない） */}
            {hasCurrent && (
              <>
                <span>·</span>
                <span>Age {pg.age}</span>
              </>
            )}
          </div>
          {profile && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
              {[
                profile.jersey ? `#${profile.jersey}` : null,
                profile.position ? profile.position.split("-")[0] : null,
                profile.height ? fmtHeight(profile.height) : null,
                profile.weight ? fmtWeight(profile.weight) : null,
                profile.birthdate ? profile.birthdate : null,
                profile.fromYear > 0 ? `NBA ${profile.fromYear}年〜` : null,
              ]
                .filter(Boolean)
                .map((item, idx, arr) => (
                  <span key={item} className="flex items-center gap-1.5">
                    {item}
                    {idx < arr.length - 1 && <span>·</span>}
                  </span>
                ))}
            </div>
          )}
        </div>
        {/* 比較ページは現季のデータだけを持つので、最新の成績が過去季の選手には出さない */}
        {season === currentSeason() && similarIds && similarIds.length > 0 && (
          <Link
            href={`/compare?ids=${[playerIdNum, ...similarIds].join(",")}`}
            className="ml-auto self-start inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            似たタイプの選手 ↗
          </Link>
        )}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Stats</CardTitle>
            {hasCurrent && poPg && <Badge className="bg-orange-500 text-white border-0 text-xs">Playoffs</Badge>}
          </div>
        </CardHeader>
        {/* 過去季の行はチェックボックス1つで開閉する（:has() で tbody を出し分け。JS なし・列幅は1つの表なので揃う） */}
        <CardContent className="group/stats">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-32">シーズン</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">チーム</th>
                  {["GP", "PTS", "REB", "AST", "STL", "BLK", "TOV", "FG%", "3P%", "FT%", "MIN"].map((h) => (
                    <th key={h} className="py-2 px-3 text-center font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hasCurrent ? rowsOf(views[0]).map(statRow) : (
                  <tr className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap font-medium text-muted-foreground">{cur} Regular Season</td>
                    {teamCell(team)}
                    {["0", "0.0", "0.0", "0.0", "0.0", "0.0", "0.0", "-", "-", "-", "0.0"].map((v, i) => (
                      <td key={i} className={`py-2 px-3 text-center font-mono ${i === 1 ? "font-semibold" : ""}`}>{v}</td>
                    ))}
                  </tr>
                )}
              </tbody>
              {pastRows.length > 0 && (
                <tbody className="hidden border-t group-has-[:checked]/stats:table-row-group">{pastRows.map(statRow)}</tbody>
              )}
            </table>
          </div>
          {pastRows.length > 0 && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50">
              <input type="checkbox" className="peer sr-only" />
              <ChevronRight className="size-3.5 transition-transform peer-checked:rotate-90" aria-hidden />
              過去シーズン
            </label>
          )}
        </CardContent>
      </Card>

      {/* 図表と Advanced Stats: 季のタブで切り替える（既定は今季）。季が1つだけならタブなし */}
      {tabs.length > 1 ? (
        // 過去季のページから来たとき（/players/<id>#2025-26）は、その季のタブを開いた状態で始める
        <HashTabs values={tabs.map((t) => t.season)} defaultValue={tabs[0].season} className="gap-6">
          <TabsList aria-label="シーズン">
            {tabs.map((t) => (
              <TabsTrigger key={t.season} value={t.season} className="px-3">{t.season}</TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            // 今季出場なしの選手は、既定のパネルが「出場なし」の1行だけになる。過去季の図を表示しないまま HTML に
            // 残して、ページ本体が空に近くならないようにする（keepMounted。見た目は変わらない。2026-10-01 決定）
            <TabsContent key={t.season} value={t.season} keepMounted={!hasCurrent}>{t.node}</TabsContent>
          ))}
        </HashTabs>
      ) : (
        tabs[0].node
      )}
    </div>
  );
}
