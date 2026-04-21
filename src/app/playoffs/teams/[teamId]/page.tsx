import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NBA_TEAMS, getTeamAbbr, getTeamColor } from "@/lib/constants/teams";
import { getPlayoffSeries, getPlayoffPlayerPerGame, getPlayoffTeamStats, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { RosterClient } from "./roster-client";

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(NBA_TEAMS).map((teamId) => ({ teamId }));
}

export default async function PlayoffTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const abbr = teamId.toUpperCase();
  const teamInfo = NBA_TEAMS[abbr];
  if (!teamInfo) notFound();

  if (!isPlayoffDataAvailable()) {
    return <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>;
  }

  const allSeries = getPlayoffSeries();
  const teamSeries = allSeries.filter(
    (s) => getTeamAbbr(s.team1) === abbr || getTeamAbbr(s.team2) === abbr
  );

  const allTeamStats = getPlayoffTeamStats();
  const teamStats = allTeamStats.find((t) => t.team === abbr);

  const poPlayers = getPlayoffPlayerPerGame().filter((p) => p.team === abbr && p.team !== "TOT");

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: teamInfo.primaryColor }} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{teamInfo.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {teamInfo.conference}ern Conference · {teamInfo.division} Division
          </p>
        </div>
        <Link href={`/teams/${abbr}`} className="ml-auto text-sm text-muted-foreground hover:underline">
          レギュラーシーズン →
        </Link>
      </div>

      {/* シリーズ状況 */}
      {teamSeries.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">プレーオフ シリーズ</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {teamSeries.map((s) => {
              const isTeam1 = getTeamAbbr(s.team1) === abbr;
              const myWins = isTeam1 ? s.team1Wins : s.team2Wins;
              const oppWins = isTeam1 ? s.team2Wins : s.team1Wins;
              const opp = isTeam1 ? s.team2 : s.team1;
              const oppAbbr = getTeamAbbr(opp);
              const won = s.winner && getTeamAbbr(s.winner) === abbr;
              const lost = s.winner && getTeamAbbr(s.winner) !== abbr;

              return (
                <Card key={`${s.team1}-${s.team2}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">{s.roundName}</Badge>
                      {won && <Badge className="text-xs bg-green-600 text-white border-0">勝利</Badge>}
                      {lost && <Badge variant="destructive" className="text-xs">敗退</Badge>}
                      {!s.winner && <Badge variant="secondary" className="text-xs">進行中</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{ color: getTeamColor(abbr) }}>{abbr}</span>
                      <span className="text-xl font-bold mx-3">{myWins} - {oppWins}</span>
                      <Link href={`/playoffs/teams/${oppAbbr}`} className="font-semibold hover:underline" style={{ color: getTeamColor(oppAbbr) }}>{oppAbbr}</Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* チームスタッツ */}
      {teamStats && (
        <section>
          <h2 className="text-lg font-semibold mb-3">チームスタッツ</h2>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["PTS", "REB", "AST", "STL", "BLK", "TOV", "FG%", "3P%", "FT%"].map((h) => (
                    <th key={h} className="py-2 px-4 text-center font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 px-4 text-center font-mono font-semibold">{teamStats.pts.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center font-mono">{teamStats.trb.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center font-mono">{teamStats.ast.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center font-mono">{teamStats.stl.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center font-mono">{teamStats.blk.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center font-mono">{teamStats.tov.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center font-mono">{(teamStats.fgPct * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-center font-mono">{(teamStats.threePtPct * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-center font-mono">{(teamStats.ftPct * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Separator />

      {/* ロスター */}
      <section>
        <h2 className="text-lg font-semibold mb-3">ロスター — プレーオフ スタッツ</h2>
        <RosterClient players={poPlayers} />
      </section>
    </div>
  );
}
