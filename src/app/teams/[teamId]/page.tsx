import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStandings, getTeamAdvanced, getTeamPerGame } from "@/lib/data/teams";
import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { NBA_TEAMS, getTeamAbbr } from "@/lib/constants/teams";
import { TeamRosterTable } from "./roster-table";

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(NBA_TEAMS).map((teamId) => ({ teamId }));
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const abbr = teamId.toUpperCase();
  const teamInfo = NBA_TEAMS[abbr];
  if (!teamInfo) notFound();

  const standings = getStandings();
  const advanced = getTeamAdvanced();
  const perGame = getTeamPerGame();
  const allPlayers = getPlayerPerGame();
  const allAdvanced = getPlayerAdvanced();

  const standing = standings.find((s) => s.teamAbbr === abbr);
  const adv = advanced.find((a) => getTeamAbbr(a.teamName) === abbr);
  const pg = perGame.find((p) => getTeamAbbr(p.teamName) === abbr);

  const roster = allPlayers.filter((p) => p.team === abbr && p.gp >= 1);
  const rosterAdvanced = new Map(
    allAdvanced.filter((p) => p.team === abbr).map((p) => [p.player, p])
  );

  const rosterRows = roster.map((player) => {
    const advancedStats = rosterAdvanced.get(player.player);

    return {
      player: player.player,
      gp: player.gp,
      mpg: player.mpg,
      pts: player.pts,
      trb: player.trb,
      ast: player.ast,
      stl: player.stl,
      blk: player.blk,
      fgPct: player.fgPct,
      threePtPct: player.threePtPct,
      offRating: advancedStats?.offRating ?? null,
      tsPct: advancedStats?.tsPct ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-lg"
          style={{ backgroundColor: teamInfo.primaryColor }}
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{teamInfo.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{teamInfo.conference}ern Conference</span>
            <span>·</span>
            <span>{teamInfo.division} Division</span>
            {standing && (
              <>
                <span>·</span>
                <Badge variant="outline">
                  {standing.wins}-{standing.losses}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* レーティング */}
      <div className="grid gap-4 sm:grid-cols-5">
        <StatCard
          label="ORtg"
          value={adv?.offRating.toFixed(1) ?? "-"}
          sub="Offensive Rating"
        />
        <StatCard
          label="DRtg"
          value={adv?.defRating.toFixed(1) ?? "-"}
          sub="Defensive Rating"
        />
        <StatCard
          label="NRtg"
          value={
            adv ? `${adv.netRating > 0 ? "+" : ""}${adv.netRating.toFixed(1)}` : "-"
          }
          sub="Net Rating"
        />
        <StatCard
          label="Pace"
          value={adv?.pace.toFixed(1) ?? "-"}
          sub="Possessions/48min"
        />
        <StatCard
          label="PIE"
          value={adv?.pie != null ? (adv.pie * 100).toFixed(1) + "%" : "-"}
          sub="Player Impact Estimate"
        />
      </div>

      {/* チームスタッツ */}
      {pg && (
        <Card>
          <CardHeader>
            <CardTitle>Team Stats (Per Game)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7">
              {[
                { label: "PTS", value: pg.pts },
                { label: "REB", value: pg.reb },
                { label: "AST", value: pg.ast },
                { label: "STL", value: pg.stl },
                { label: "BLK", value: pg.blk },
                { label: "TOV", value: pg.tov },
                { label: "FG%", value: pg.fgPct, pct: true },
                { label: "3P%", value: pg.fg3Pct, pct: true },
                { label: "FT%", value: pg.ftPct, pct: true },
                { label: "ORB", value: pg.oreb },
                { label: "DRB", value: pg.dreb },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                  <div className="text-lg font-semibold font-mono">
                    {stat.pct
                      ? (stat.value * 100).toFixed(1) + "%"
                      : stat.value.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ロスター */}
      <Card>
        <CardHeader>
          <CardTitle>Roster ({rosterRows.length} players)</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamRosterTable rows={rosterRows} />
        </CardContent>
      </Card>
    </div>
  );
}
