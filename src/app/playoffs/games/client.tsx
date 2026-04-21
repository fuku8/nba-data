"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
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
  const vWin = vPts > hPts;
  const hWin = hPts > vPts;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground mb-2">{game.Date}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-right">
            <span className="text-sm font-medium" style={{ color: getTeamColor(game.Visitor) }}>{game.Visitor}</span>
            <span className={`text-2xl font-bold ml-2 ${vWin ? "text-foreground" : "text-muted-foreground"}`}>{game.VisitorPTS}</span>
          </div>
          <span className="text-muted-foreground text-xs">@</span>
          <div className="flex-1">
            <span className={`text-2xl font-bold mr-2 ${hWin ? "text-foreground" : "text-muted-foreground"}`}>{game.HomePTS}</span>
            <span className="text-sm font-medium" style={{ color: getTeamColor(game.Home) }}>{game.Home}</span>
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
        <p className="text-muted-foreground mt-1">プレーオフ 試合スコア</p>
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
          {dayGames.map((g, i) => <GameCard key={i} game={g} />)}
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
