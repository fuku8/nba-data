import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerProfile, getPlayerTotals } from "@/lib/data/players";
import { getPlayoffPlayerPerGame, getPlayoffPlayerAdvanced, getPlayoffPlayerTotals } from "@/lib/data/playoffs";
import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";
import { PercentileBars, percentileOf, type PercentileRow } from "@/components/percentile-bars";
import { VersatilityRadar, versatilityScore } from "@/components/versatility-radar";
import { ScoringWaffle } from "@/components/scoring-waffle";
import { ShotChart } from "@/components/shot-chart";
import { getPlayerShots, type Shot } from "@/lib/data/shots";
import { getPlayerHustle, getPlayoffPlayerHustle, getPlayerSpeed, getPlayoffPlayerSpeed, getPlayerPossessions, getPlayoffPlayerPossessions, type PlayerHustle, type PlayerSpeed, type PlayerPossessions } from "@/lib/data/tracking";
import { MetricLink } from "@/components/metric-link";
import { getPlayerTypes, getPoSwing, MIN_GP, PO_MIN_GP, type TypeBadge, type PoSwing } from "@/lib/data/player-types";
import { getSimilarPlayers } from "@/lib/data/similar";

export const revalidate = 3600;

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
}: {
  title: string;
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
                2026 PO {swingLabel}
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
      {pctRows && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>League Percentile</CardTitle>
              <MetricLink anchor="percentile" />
            </div>
            <p className="text-xs text-muted-foreground">{pctNote}</p>
          </CardHeader>
          <CardContent>
            <PercentileBars rows={pctRows} />
          </CardContent>
        </Card>
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
              <CardContent className="flex justify-center">
                <ShotChart shots={shots} />
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
              <CardContent className="flex justify-center">
                <VersatilityRadar items={radarItems} />
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
                <ScoringWaffle pts3={pts3} pts2={pts2} ptsFt={ptsFt} />
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
              <CardContent className="flex justify-center">
                <VersatilityRadar items={hustleItems} />
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
              <CardContent className="space-y-3">
                <PercentileBars rows={motion.items} />
                <p className="text-xs text-muted-foreground">
                  合計走行距離 {motion.distKm.toFixed(1)}km = フルマラソン{motion.marathons.toFixed(1)}本分
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const playerIdNum = parseInt(playerId, 10);
  if (isNaN(playerIdNum)) notFound();

  const allPerGame = getPlayerPerGame();
  const allAdvanced = getPlayerAdvanced();
  const allPoPerGame = getPlayoffPlayerPerGame();
  const allPoAdvanced = getPlayoffPlayerAdvanced();
  const profile = getPlayerProfile(playerIdNum);

  const pg = allPerGame.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPerGame.find((p) => p.playerId === playerIdNum);
  const adv = allAdvanced.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allAdvanced.find((p) => p.playerId === playerIdNum);
  const poPg = allPoPerGame.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPoPerGame.find((p) => p.playerId === playerIdNum);
  const poAdv = allPoAdvanced.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPoAdvanced.find((p) => p.playerId === playerIdNum);

  if (!pg) notFound();

  const teamInfo = getTeamInfo(pg.team);

  const fmtPct = (v: number | undefined | null) => (v != null && v !== 0) ? (v * 100).toFixed(1) + "%" : "-";

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
  const pctRows = pgFull.gp >= MIN_GP
    ? buildPctRows(pgFull, advFull, dedupe(allPerGame, MIN_GP), dedupe(allAdvanced, MIN_GP))
    : null;
  const poPctRows = poEligible
    ? buildPctRows(poPg, poAdv, dedupe(allPoPerGame, PO_MIN_GP), dedupe(allPoAdvanced, PO_MIN_GP))
    : null;

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
  const allTotals = getPlayerTotals();
  const t = allTotals.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    ?? allTotals.find((p) => p.playerId === playerIdNum);
  const pts3 = t ? (t.threePt * 3) / t.gp : pg.threePt * 3;
  const pts2 = t ? ((t.fg - t.threePt) * 2) / t.gp : (pg.fg - pg.threePt) * 2;
  const ptsFt = t ? t.ft / t.gp : pg.ft;
  // PO版ワッフル（パーセンタイルと同じGP4以上を条件に。少試合のノイズ表示を防ぐ）
  const allPoTotals = poEligible ? getPlayoffPlayerTotals() : [];
  const poT = allPoTotals.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    ?? allPoTotals.find((p) => p.playerId === playerIdNum);
  const poPts3 = poT ? (poT.threePt * 3) / poT.gp : 0;
  const poPts2 = poT ? ((poT.fg - poT.threePt) * 2) / poT.gp : 0;
  const poPtsFt = poT ? poT.ft / poT.gp : 0;
  // 選手タイプ＋PO昇温（Phase 5）
  const rsBadges = getPlayerTypes("rs").get(playerIdNum)?.badges ?? null;
  const poBadges = poEligible ? getPlayerTypes("po").get(playerIdNum)?.badges ?? null : null;
  const poSwing = getPoSwing().get(playerIdNum) ?? null;

  // ショットチャート（Phase 3・ローカル一括取得したdata/shots/があるときのみ表示）
  const shots = getPlayerShots(playerIdNum);
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
  const hustleItems = buildHustle(getPlayerHustle(), MIN_GP);
  const poHustleItems = poEligible ? buildHustle(getPlayoffPlayerHustle(), PO_MIN_GP) : null;

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
  const motion = buildMotion(getPlayerSpeed(), getPlayerPossessions(), MIN_GP);
  const poMotion = poEligible ? buildMotion(getPlayoffPlayerSpeed(), getPlayoffPlayerPossessions(), PO_MIN_GP) : null;

  // 似たタイプの選手: スタッツのユークリッド距離が近い3名へのリンク
  const similarIds = getSimilarPlayers(playerIdNum);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
          style={{ backgroundColor: getTeamColor(pg.team) }}
        >
          {pg.player.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pg.player}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link href={`/teams/${pg.team}`} className="hover:underline flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(pg.team) }} />
              {teamInfo?.name ?? pg.team}
            </Link>
            <span>·</span>
            <span>Age {pg.age}</span>
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
        {similarIds && similarIds.length > 0 && (
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
            {poPg && <Badge className="bg-orange-500 text-white border-0 text-xs">Playoffs</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-32">シーズン</th>
                  {["GP", "PTS", "REB", "AST", "STL", "BLK", "TOV", "FG%", "3P%", "FT%", "MIN"].map((h) => (
                    <th key={h} className="py-2 px-3 text-center font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {poPg && (
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-semibold text-orange-400">Playoffs</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.gp}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">{poPg.pts.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.trb.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.ast.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.stl.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.blk.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.tov.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{fmtPct(poPg.fgPct)}</td>
                    <td className="py-2 px-3 text-center font-mono">{fmtPct(poPg.threePtPct)}</td>
                    <td className="py-2 px-3 text-center font-mono">{fmtPct(poPg.ftPct)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.mpg.toFixed(1)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted-foreground">Regular Season</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.gp}</td>
                  <td className="py-2 px-3 text-center font-mono font-semibold">{pg.pts.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.trb.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.ast.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.stl.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.blk.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.tov.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{fmtPct(pg.fgPct)}</td>
                  <td className="py-2 px-3 text-center font-mono">{fmtPct(pg.threePtPct)}</td>
                  <td className="py-2 px-3 text-center font-mono">{fmtPct(pg.ftPct)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.mpg.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Playoffs ビジュアル */}
      <VisualGroup
        title="Playoffs"
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

      {/* Regular Season ビジュアル */}
      <VisualGroup
        title="Regular Season"
        pctNote={`GP${MIN_GP}以上の選手内での位置（100が最上位）`}
        pctRows={pctRows}
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

      {/* Advanced Stats */}
      {(adv || poAdv) && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
