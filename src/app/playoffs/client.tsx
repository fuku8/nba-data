"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayoffSeries, PlayoffPlayerPerGame } from "@/lib/types";

const ROUND_ORDER = [1, 2, 3, 4];
const CONFERENCE: Record<number, string> = { 1: "1回戦", 2: "2回戦", 3: "カンファレンス決勝", 4: "ファイナル" };

function SeriesCard({ s }: { s: PlayoffSeries }) {
  const inProgress = !s.winner;
  const t1Color = getTeamColor(s.team1);
  const t2Color = getTeamColor(s.team2);

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-sm font-semibold truncate w-full text-center" style={{ color: t1Color }}>{s.team1}</span>
            <span className="text-3xl font-bold mt-1">{s.team1Wins}</span>
          </div>
          <div className="flex flex-col items-center px-2">
            {inProgress ? (
              <Badge variant="secondary" className="text-xs">進行中</Badge>
            ) : (
              <Badge className="text-xs bg-orange-500 text-white border-0">終了</Badge>
            )}
            <span className="text-xs text-muted-foreground mt-1">{s.seriesStatus}</span>
          </div>
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-sm font-semibold truncate w-full text-center" style={{ color: t2Color }}>{s.team2}</span>
            <span className="text-3xl font-bold mt-1">{s.team2Wins}</span>
          </div>
        </div>
        {s.winner && (
          <p className="text-center text-xs text-muted-foreground mt-2">Winner: <span className="font-medium text-foreground">{s.winner}</span></p>
        )}
      </CardContent>
    </Card>
  );
}

function StatLeaders({ players, label, getValue }: { players: PlayoffPlayerPerGame[]; label: string; getValue: (p: PlayoffPlayerPerGame) => number }) {
  const top3 = [...players].sort((a, b) => getValue(b) - getValue(a)).slice(0, 3);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top3.map((p, i) => (
          <div key={p.player} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 text-muted-foreground font-mono">{i + 1}</span>
              <Link href={`/players/${encodeURIComponent(p.player)}`} className="hover:underline font-medium truncate max-w-[120px]">{p.player}</Link>
              <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: getTeamColor(p.team) }}>{p.team}</Badge>
            </div>
            <span className="font-mono font-semibold">{getValue(p).toFixed(1)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PlayoffsTopClient({ series, players }: { series: PlayoffSeries[]; players: PlayoffPlayerPerGame[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NBA 2025-26 Playoffs</h1>
        <p className="text-muted-foreground mt-1">プレーオフ ブラケット・スタッツ</p>
      </div>

      {ROUND_ORDER.map((round) => {
        const roundSeries = series.filter((s) => s.round === round);
        if (roundSeries.length === 0) return null;
        return (
          <section key={round}>
            <h2 className="text-lg font-semibold mb-3">{CONFERENCE[round]}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {roundSeries.map((s) => (
                <SeriesCard key={`${s.team1}-${s.team2}`} s={s} />
              ))}
            </div>
          </section>
        );
      })}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">スタッツリーダー</h2>
          <Link href="/playoffs/leaders" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatLeaders players={players} label="得点 (PTS)" getValue={(p) => p.pts} />
          <StatLeaders players={players} label="リバウンド (REB)" getValue={(p) => p.trb} />
          <StatLeaders players={players} label="アシスト (AST)" getValue={(p) => p.ast} />
        </div>
      </section>
    </div>
  );
}
