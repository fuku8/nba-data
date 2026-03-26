import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals } from "@/lib/data/players";
import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";

export const revalidate = 3600;

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-mono ${highlight ? "font-bold" : "font-semibold"}`}>{value}</div>
    </div>
  );
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const playerName = decodeURIComponent(playerId);

  const allPerGame = getPlayerPerGame();
  const allAdvanced = getPlayerAdvanced();
  const allTotals = getPlayerTotals();

  // TOTでないレコードを優先、なければTOTを使用
  const pg = allPerGame.find((p) => p.player === playerName && p.team !== "TOT")
    || allPerGame.find((p) => p.player === playerName);
  const adv = allAdvanced.find((p) => p.player === playerName && p.team !== "TOT")
    || allAdvanced.find((p) => p.player === playerName);
  const totals = allTotals.find((p) => p.player === playerName && p.team !== "TOT")
    || allTotals.find((p) => p.player === playerName);

  if (!pg) notFound();

  const teamInfo = getTeamInfo(pg.team);

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
            <span>{pg.pos}</span>
            <span>·</span>
            <span>Age {pg.age}</span>
          </div>
        </div>
      </div>

      {/* Season Averages */}
      <Card>
        <CardHeader>
          <CardTitle>Season Averages (Per Game)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-10">
            <StatBlock label="GP" value={String(pg.gp)} />
            <StatBlock label="MPG" value={pg.mpg.toFixed(1)} />
            <StatBlock label="PTS" value={pg.pts.toFixed(1)} highlight />
            <StatBlock label="REB" value={pg.trb.toFixed(1)} highlight />
            <StatBlock label="AST" value={pg.ast.toFixed(1)} highlight />
            <StatBlock label="STL" value={pg.stl.toFixed(1)} />
            <StatBlock label="BLK" value={pg.blk.toFixed(1)} />
            <StatBlock label="TOV" value={pg.tov.toFixed(1)} />
            <StatBlock label="FG%" value={pg.fgPct ? (pg.fgPct * 100).toFixed(1) + "%" : "-"} />
            <StatBlock label="3P%" value={pg.threePtPct ? (pg.threePtPct * 100).toFixed(1) + "%" : "-"} />
            <StatBlock label="FT%" value={pg.ftPct ? (pg.ftPct * 100).toFixed(1) + "%" : "-"} />
            <StatBlock label="eFG%" value={pg.efgPct ? (pg.efgPct * 100).toFixed(1) + "%" : "-"} />
          </div>
        </CardContent>
      </Card>

      {/* Shooting Splits */}
      <Card>
        <CardHeader>
          <CardTitle>Shooting Splits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">FG</div>
              <div className="font-mono">{pg.fg.toFixed(1)} / {pg.fga.toFixed(1)}</div>
              <div className="text-sm font-semibold">{pg.fgPct ? (pg.fgPct * 100).toFixed(1) + "%" : "-"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">3PT</div>
              <div className="font-mono">{pg.threePt.toFixed(1)} / {pg.threePtA.toFixed(1)}</div>
              <div className="text-sm font-semibold">{pg.threePtPct ? (pg.threePtPct * 100).toFixed(1) + "%" : "-"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">2PT</div>
              <div className="font-mono">{pg.twoPt.toFixed(1)} / {pg.twoPtA.toFixed(1)}</div>
              <div className="text-sm font-semibold">{pg.twoPtPct ? (pg.twoPtPct * 100).toFixed(1) + "%" : "-"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">FT</div>
              <div className="font-mono">{pg.ft.toFixed(1)} / {pg.fta.toFixed(1)}</div>
              <div className="text-sm font-semibold">{pg.ftPct ? (pg.ftPct * 100).toFixed(1) + "%" : "-"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">ORB / DRB</div>
              <div className="font-mono">{pg.orb.toFixed(1)} / {pg.drb.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">PF</div>
              <div className="font-mono">{pg.pf.toFixed(1)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Stats */}
      {adv && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
              <StatBlock label="PER" value={adv.per.toFixed(1)} highlight />
              <StatBlock label="TS%" value={(adv.tsPct * 100).toFixed(1) + "%"} />
              <StatBlock label="USG%" value={adv.usgPct.toFixed(1) + "%"} />
              <StatBlock label="OWS" value={adv.ows.toFixed(1)} />
              <StatBlock label="DWS" value={adv.dws.toFixed(1)} />
              <StatBlock label="WS" value={adv.ws.toFixed(1)} highlight />
              <StatBlock label="WS/48" value={adv.wsPer48.toFixed(3)} />
              <StatBlock label="BPM" value={(adv.bpm > 0 ? "+" : "") + adv.bpm.toFixed(1)} highlight />
              <StatBlock label="VORP" value={adv.vorp.toFixed(1)} />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7">
              <StatBlock label="OBPM" value={(adv.obpm > 0 ? "+" : "") + adv.obpm.toFixed(1)} />
              <StatBlock label="DBPM" value={(adv.dbpm > 0 ? "+" : "") + adv.dbpm.toFixed(1)} />
              <StatBlock label="AST%" value={adv.astPct.toFixed(1) + "%"} />
              <StatBlock label="TRB%" value={adv.trbPct.toFixed(1) + "%"} />
              <StatBlock label="STL%" value={adv.stlPct.toFixed(1) + "%"} />
              <StatBlock label="BLK%" value={adv.blkPct.toFixed(1) + "%"} />
              <StatBlock label="TOV%" value={adv.tovPct.toFixed(1) + "%"} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Totals */}
      {totals && (
        <Card>
          <CardHeader>
            <CardTitle>Season Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
              <StatBlock label="MIN" value={String(totals.mp)} />
              <StatBlock label="PTS" value={String(totals.pts)} highlight />
              <StatBlock label="REB" value={String(totals.trb)} />
              <StatBlock label="AST" value={String(totals.ast)} />
              <StatBlock label="STL" value={String(totals.stl)} />
              <StatBlock label="BLK" value={String(totals.blk)} />
              <StatBlock label="3PM" value={String(totals.threePt)} />
              <StatBlock label="FTM" value={String(totals.ft)} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
