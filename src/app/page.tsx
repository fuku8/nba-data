import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStandings, getTeamAdvanced } from "@/lib/data/teams";
import { getPlayerPerGame } from "@/lib/data/players";
import { getLatestGameDate } from "@/lib/data/csv-utils";
import { getTeamAbbr, getTeamColor } from "@/lib/constants/teams";
import { isPlayoffDataAvailable, getPlayoffSeries, getPlayoffPlayerPerGame } from "@/lib/data/playoffs";
import { PlayoffsTopClient } from "@/app/playoffs/client";

export const revalidate = 3600;

function LeaderCard({ title, players }: { title: string; players: { name: string; team: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {players.map((p, i) => (
          <div key={`${p.name}-${i}`} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-4">{i + 1}</span>
              <Link href={`/players/${encodeURIComponent(p.name)}`} className="font-medium hover:underline">{p.name}</Link>
              <Link href={`/teams/${p.team}`}>
                <Badge variant="outline" className="text-xs hover:bg-accent transition-colors" style={{ borderColor: getTeamColor(p.team) }}>{p.team}</Badge>
              </Link>
            </div>
            <span className="font-mono font-semibold">{p.value.toFixed(1)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RSHomePage() {
  const standings = getStandings();
  const advanced = getTeamAdvanced();
  const players = getPlayerPerGame().filter((p) => p.gp >= 30 && p.team !== "TOT");
  const latestGameDate = getLatestGameDate();

  const ptsLeaders = [...players].sort((a, b) => b.pts - a.pts).slice(0, 5).map((p) => ({ name: p.player, team: p.team, value: p.pts }));
  const rebLeaders = [...players].sort((a, b) => b.trb - a.trb).slice(0, 5).map((p) => ({ name: p.player, team: p.team, value: p.trb }));
  const astLeaders = [...players].sort((a, b) => b.ast - a.ast).slice(0, 5).map((p) => ({ name: p.player, team: p.team, value: p.ast }));

  const eastTop = standings.filter((s) => s.conference === "East").sort((a, b) => b.winPct - a.winPct).slice(0, 8);
  const westTop = standings.filter((s) => s.conference === "West").sort((a, b) => b.winPct - a.winPct).slice(0, 8);

  const bestOff = [...advanced].sort((a, b) => b.offRating - a.offRating)[0];
  const bestDef = [...advanced].sort((a, b) => a.defRating - b.defRating)[0];
  const bestNet = [...advanced].sort((a, b) => b.netRating - a.netRating)[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NBA 2025-26 Dashboard</h1>
        <p className="text-muted-foreground mt-1">データ反映: {latestGameDate} (米国東部時間)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {bestOff && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Best Offense</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bestOff.offRating.toFixed(1)}</div>
              <Link href={`/teams/${getTeamAbbr(bestOff.team)}`} className="text-sm text-muted-foreground hover:underline">{bestOff.team}</Link>
            </CardContent>
          </Card>
        )}
        {bestDef && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Best Defense</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bestDef.defRating.toFixed(1)}</div>
              <Link href={`/teams/${getTeamAbbr(bestDef.team)}`} className="text-sm text-muted-foreground hover:underline">{bestDef.team}</Link>
            </CardContent>
          </Card>
        )}
        {bestNet && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Best Net Rating</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bestNet.netRating > 0 ? "+" : ""}{bestNet.netRating.toFixed(1)}</div>
              <Link href={`/teams/${getTeamAbbr(bestNet.team)}`} className="text-sm text-muted-foreground hover:underline">{bestNet.team}</Link>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">League Leaders</h2>
          <Link href="/leaders" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <LeaderCard title="得点 (PTS)" players={ptsLeaders} />
          <LeaderCard title="リバウンド (REB)" players={rebLeaders} />
          <LeaderCard title="アシスト (AST)" players={astLeaders} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Standings</h2>
          <Link href="/standings" className="text-sm text-muted-foreground hover:underline">詳細を見る →</Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[{ title: "Eastern Conference", teams: eastTop }, { title: "Western Conference", teams: westTop }].map(({ title, teams }) => (
            <Card key={title}>
              <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {teams.map((t, i) => {
                    const abbr = getTeamAbbr(t.team);
                    return (
                      <Link key={t.team} href={`/teams/${abbr}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-center text-muted-foreground">{i + 1}</span>
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(abbr) }} />
                          <span className="font-medium">{t.team}</span>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-xs">
                          <span>{t.wins}-{t.losses}</span>
                          <span className="w-12 text-right">{t.winPct.toFixed(3)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const isPlayoffs = isPlayoffDataAvailable();

  if (isPlayoffs) {
    const series = getPlayoffSeries();
    const players = getPlayoffPlayerPerGame().filter((p) => p.team !== "TOT");
    return (
      <div className="space-y-8">
        {/* RS へのナビゲーションバナー */}
        <div className="rounded-lg border bg-card px-5 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">レギュラーシーズンのスタッツを見る</p>
          <div className="flex items-center gap-3">
            <Link href="/standings" className="text-sm font-medium hover:underline">順位表</Link>
            <Link href="/players" className="text-sm font-medium hover:underline">選手</Link>
            <Link href="/leaders" className="text-sm font-medium hover:underline">リーダーズ</Link>
            <Link href="/teams" className="text-sm font-medium hover:underline">チーム</Link>
          </div>
        </div>
        <PlayoffsTopClient series={series} players={players} />
      </div>
    );
  }

  return <RSHomePage />;
}
