import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NBA_TEAMS, getTeamAbbr, getTeamColor } from "@/lib/constants/teams";
import { getPlayoffSeries, getPlayoffPlayerPerGame, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { getPlayerPerGame } from "@/lib/data/players";

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(NBA_TEAMS).map((teamId) => ({ teamId }));
}

const COMPARE_STATS: { key: string; label: string; pct?: boolean }[] = [
  { key: "pts", label: "PTS" },
  { key: "trb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "tov", label: "TOV" },
  { key: "fgPct", label: "FG%", pct: true },
  { key: "threePtPct", label: "3P%", pct: true },
  { key: "ftPct", label: "FT%", pct: true },
];

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

  const poPlayers = getPlayoffPlayerPerGame().filter((p) => p.team === abbr);
  const rsPlayers = getPlayerPerGame().filter((p) => p.team === abbr && p.gp >= 1);

  // PO選手のMapを作成
  const poPlayerMap = new Map(poPlayers.map((p) => [p.player, p]));

  // ロスター（RS + PO両方に出た選手）
  const rosterRows = rsPlayers.map((rsp) => {
    const pop = poPlayerMap.get(rsp.player);
    return { rs: rsp, po: pop ?? null };
  });

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

      <Separator />

      {/* ロスター: RS vs PO 比較 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">ロスター — RS / PO スタッツ比較</h2>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left py-2 px-3 font-medium sticky left-0 bg-muted/50">選手</th>
                <th className="py-2 px-2 text-center text-muted-foreground font-medium w-8">POS</th>
                {COMPARE_STATS.map((s) => (
                  <th key={s.key} className="py-2 px-2 text-center font-medium" colSpan={2}>
                    {s.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th className="sticky left-0 bg-muted/50" />
                <th />
                {COMPARE_STATS.map((s) => (
                  <React.Fragment key={s.key}>
                    <th className="py-1 px-2 text-center text-xs text-muted-foreground font-normal">RS</th>
                    <th className="py-1 px-2 text-center text-xs text-orange-400 font-normal">PO</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {rosterRows.map(({ rs, po }) => (
                <tr key={rs.player} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 font-medium sticky left-0 bg-background">
                    <Link href={`/players/${encodeURIComponent(rs.player)}`} className="hover:underline">{rs.player}</Link>
                  </td>
                  <td className="py-2 px-2 text-center text-muted-foreground text-xs">{rs.pos}</td>
                  {COMPARE_STATS.map((stat) => {
                    const rsVal = ((rs as unknown) as Record<string, number>)[stat.key] ?? 0;
                    const poVal = po ? ((po as unknown) as Record<string, number>)[stat.key] ?? 0 : null;
                    const fmt = (v: number) => stat.pct ? (v * 100).toFixed(1) + "%" : v.toFixed(1);
                    return (
                      <React.Fragment key={`${rs.player}-${stat.key}`}>
                        <td className="py-2 px-2 text-center font-mono text-muted-foreground text-xs">{fmt(rsVal)}</td>
                        <td className="py-2 px-2 text-center font-mono font-semibold text-xs">{poVal !== null ? fmt(poVal) : <span className="text-muted-foreground">-</span>}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
