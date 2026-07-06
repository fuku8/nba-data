import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStandings, getTeamAdvanced, getTeamPerGame, getTeamPointsGini, GINI_MIN_MP } from "@/lib/data/teams";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals } from "@/lib/data/players";
import { getTeamMargins } from "@/lib/data/games";
import { SeasonHeartbeat } from "@/components/season-heartbeat";
import { LorenzCurve } from "@/components/lorenz-curve";
import { PossessionBand } from "@/components/possession-band";
import { getPlayerPossessions } from "@/lib/data/tracking";
import { MetricLink } from "@/components/metric-link";
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

  const margins = getTeamMargins(abbr);

  // ワンマン度: チーム内得点分布のGini係数（MIN200以上でゴミ時間出場を除外）とリーグ内順位
  const giniByTeam = getTeamPointsGini();
  const teamGini = giniByTeam.find((g) => g.team === abbr);
  const giniRank = teamGini ? giniByTeam.indexOf(teamGini) + 1 : null;
  const teamScorers = teamGini?.players ?? [];
  const teamTotalPts = getPlayerTotals()
    .filter((p) => p.team === abbr)
    .reduce((a, p) => a + p.pts, 0);
  const topShare = teamScorers.length > 0 && teamTotalPts > 0
    ? teamScorers[0].pts / teamTotalPts
    : 0;

  // ボール支配の帯: シーズン総タッチ数（タッチ/試合 × GP）のチーム内シェア
  const teamPoss = getPlayerPossessions()
    .filter((p) => p.team === abbr && p.gp > 0)
    .map((p) => ({ name: p.player, total: p.touches * p.gp }))
    .sort((a, b) => b.total - a.total);
  const possTotal = teamPoss.reduce((a, p) => a + p.total, 0);
  const TOP_N = 8;
  const possSegments = possTotal > 0
    ? [
        ...teamPoss.slice(0, TOP_N).map((p) => ({ name: p.name, share: p.total / possTotal })),
        ...(teamPoss.length > TOP_N
          ? [{ name: "その他", share: teamPoss.slice(TOP_N).reduce((a, p) => a + p.total, 0) / possTotal }]
          : []),
      ]
    : [];

  const roster = allPlayers.filter((p) => p.team === abbr && p.gp >= 1);
  const rosterAdvanced = new Map(
    allAdvanced.filter((p) => p.team === abbr).map((p) => [p.player, p])
  );

  const rosterRows = roster.map((player) => {
    const advancedStats = rosterAdvanced.get(player.player);

    return {
      playerId: player.playerId,
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
      defRating: advancedStats?.defRating ?? null,
      netRating: advancedStats?.netRating ?? null,
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

      {/* シーズン心電図 & ワンマン度（PCでは横並び） */}
      <div className="grid gap-6 lg:grid-cols-2">
        {margins.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Season Heartbeat</CardTitle>
                <MetricLink anchor="heartbeat" />
              </div>
              <p className="text-xs text-muted-foreground">全{margins.length}試合の点差 · 上=勝ち / 下=負け · バーにホバーで詳細</p>
            </CardHeader>
            <CardContent>
              <SeasonHeartbeat games={margins} />
            </CardContent>
          </Card>
        )}

        {teamGini && teamScorers.length >= 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>
                  ワンマン度 {teamGini.gini.toFixed(3)} · 偏り NBA{giniRank}位 / {giniByTeam.length}チーム
                </CardTitle>
                <MetricLink anchor="one-man" />
              </div>
              <p className="text-xs text-muted-foreground">
                得点分布の偏り（Gini係数・MIN{GINI_MIN_MP}以上、1位=最も偏っている） · 最多得点者
                {teamScorers[0].player}がチーム得点の{(topShare * 100).toFixed(1)}%
                · トレード選手はシーズン通算を現所属に計上
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <LorenzCurve values={teamScorers.map((p) => p.pts)} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ボール支配の帯 */}
      {possSegments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>ボール支配</CardTitle>
              <MetricLink anchor="possession" />
            </div>
            <p className="text-xs text-muted-foreground">
              シーズン総タッチ数のチーム内シェア（上位{TOP_N}人＋その他） · ボールが誰の手を経由するか · トレード選手はシーズン通算を現所属に計上
            </p>
          </CardHeader>
          <CardContent>
            <PossessionBand segments={possSegments} color={teamInfo.primaryColor} />
          </CardContent>
        </Card>
      )}

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
