import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerProfile } from "@/lib/data/players";
import { getPlayoffPlayerPerGame, getPlayoffPlayerAdvanced } from "@/lib/data/playoffs";
import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";
import { PercentileBars, percentileOf, type PercentileRow } from "@/components/percentile-bars";

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
  // GP下限はRS=20/82試合、PO=4試合（1シリーズ弱）で母集団を回転選手に絞る
  const MIN_GP = 20;
  const PO_MIN_GP = 4;
  type PgRow = typeof allPerGame[number];
  type AdvRow = typeof allAdvanced[number];
  const dedupe = <T extends { playerId: number; team: string; gp: number }>(all: T[], minGp: number) => {
    const byId = new Map<number, T>();
    for (const p of all) {
      if (p.team === "TOT" || !byId.has(p.playerId)) byId.set(p.playerId, p);
    }
    return [...byId.values()].filter((p) => p.gp >= minGp);
  };
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
  const poPctRows = poPg && poPg.gp >= PO_MIN_GP
    ? buildPctRows(poPg, poAdv, dedupe(allPoPerGame, PO_MIN_GP), dedupe(allPoAdvanced, PO_MIN_GP))
    : null;

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

      {/* League Percentile */}
      {(pctRows || poPctRows) && (
        <Card>
          <CardHeader>
            <CardTitle>League Percentile</CardTitle>
            <p className="text-xs text-muted-foreground">リーグ内での位置（100が最上位）</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {poPctRows && (
              <div>
                <div className="text-xs font-medium text-orange-400 mb-2">Playoffs · GP{PO_MIN_GP}以上のPO出場選手内</div>
                <PercentileBars rows={poPctRows} />
              </div>
            )}
            {pctRows && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Regular Season · GP{MIN_GP}以上の選手内</div>
                <PercentileBars rows={pctRows} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
