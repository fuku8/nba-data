"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor, getTeamAbbr } from "@/lib/constants/teams";
import type { PlayoffSeries } from "@/lib/types";

interface Game {
  Date: string;
  Visitor: string;
  VisitorPTS: string;
  Home: string;
  HomePTS: string;
}

function GameCard({ game }: { game: Game }) {
  const vPts = parseInt(game.VisitorPTS);
  const hPts = parseInt(game.HomePTS);
  const homeWin = hPts > vPts;
  const visitorAbbr = getTeamAbbr(game.Visitor);
  const homeAbbr = getTeamAbbr(game.Home);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{game.Date}</span>
          <Badge variant="secondary" className="text-xs">Final</Badge>
        </div>
        <div className="space-y-2">
          <div className={`flex items-center justify-between ${homeWin ? "opacity-60" : ""}`}>
            <Link href={`/playoffs/teams/${visitorAbbr}`} className="flex items-center gap-2 hover:underline">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(visitorAbbr) }} />
              <span className={`font-medium ${!homeWin ? "font-semibold" : ""}`}>{game.Visitor}</span>
            </Link>
            <span className={`font-mono text-lg ${!homeWin ? "font-bold" : ""}`}>{vPts}</span>
          </div>
          <div className={`flex items-center justify-between ${!homeWin ? "opacity-60" : ""}`}>
            <Link href={`/playoffs/teams/${homeAbbr}`} className="flex items-center gap-2 hover:underline">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(homeAbbr) }} />
              <span className={`font-medium ${homeWin ? "font-semibold" : ""}`}>{game.Home}</span>
              <span className="text-xs text-muted-foreground">HOME</span>
            </Link>
            <span className={`font-mono text-lg ${homeWin ? "font-bold" : ""}`}>{hPts}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayoffGamesClient({ series, games }: { series: PlayoffSeries[]; games: Record<string, string>[] }) {
  const allDates = useMemo(() => {
    const dates = [...new Set(games.map((g) => g.Date))].sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
    return dates;
  }, [games]);

  const [selectedDate, setSelectedDate] = useState(allDates[allDates.length - 1] ?? "");

  const dayGames = useMemo(
    () => (games as unknown as Game[]).filter((g) => g.Date === selectedDate),
    [games, selectedDate]
  );

  const selectedIdx = allDates.indexOf(selectedDate);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PO 試合結果</h1>
        <p className="text-muted-foreground mt-1">プレーオフ 試合スコア · 日付は米国東部時間(ET)基準</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedDate(allDates[selectedIdx - 1])}
          disabled={selectedIdx <= 0}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent"
        >
          ← 前日
        </button>
        <span className="text-sm font-medium px-2">{selectedDate}</span>
        <button
          onClick={() => setSelectedDate(allDates[selectedIdx + 1])}
          disabled={selectedIdx >= allDates.length - 1}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent"
        >
          翌日 →
        </button>
      </div>

      {dayGames.length === 0 ? (
        <p className="text-muted-foreground">この日の試合はありません</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dayGames.map((g) => <GameCard key={`${g.Visitor}-${g.Home}-${g.Date}`} game={g} />)}
        </div>
      )}

      {series.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">シリーズ状況</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {series.map((s) => (
              <Card key={`${s.team1}-${s.team2}`} className="text-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: getTeamColor(s.team1) }}>{s.team1}</span>
                    <Badge variant={s.winner ? "default" : "secondary"} className="text-xs mx-1">
                      {s.seriesStatus}
                    </Badge>
                    <span style={{ color: getTeamColor(s.team2) }}>{s.team2}</span>
                  </div>
                  {s.winner && <p className="text-xs text-muted-foreground mt-1 text-center">Winner: {s.winner}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
