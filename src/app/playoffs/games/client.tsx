"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayoffSeries } from "@/lib/types";
import type { PoGame } from "./page";

function GameCard({ game }: { game: PoGame }) {
  const router = useRouter();
  const homeWin = game.homeWl === "W";
  const inProgress = !game.homeWl;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/playoffs/games/${game.gameId}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/playoffs/games/${game.gameId}`)}
      className="cursor-pointer"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">{game.gameDate}</span>
            <Badge variant={inProgress ? "outline" : "secondary"} className="text-xs">
              {inProgress ? "進行中" : "Final"}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center justify-between ${!inProgress && homeWin ? "opacity-50" : ""}`}>
              <Link
                href={`/playoffs/teams/${game.awayTeam}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 hover:underline"
              >
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(game.awayTeam) }} />
                <span className={`font-medium ${!inProgress && !homeWin ? "font-bold" : ""}`}>{game.awayTeam}</span>
              </Link>
              <span className={`font-mono text-lg ${!inProgress && !homeWin ? "font-bold" : ""}`}>{game.awayPts || "—"}</span>
            </div>
            <div className={`flex items-center justify-between ${!inProgress && !homeWin ? "opacity-50" : ""}`}>
              <Link
                href={`/playoffs/teams/${game.homeTeam}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 hover:underline"
              >
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(game.homeTeam) }} />
                <span className={`font-medium ${!inProgress && homeWin ? "font-bold" : ""}`}>{game.homeTeam}</span>
                <span className="text-xs text-muted-foreground">HOME</span>
              </Link>
              <span className={`font-mono text-lg ${!inProgress && homeWin ? "font-bold" : ""}`}>{game.homePts || "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlayoffGamesClient({ series, games }: { series: PlayoffSeries[]; games: PoGame[] }) {
  const allDates = useMemo(() => {
    return [...new Set(games.map((g) => g.gameDate))].sort();
  }, [games]);

  const [selectedDate, setSelectedDate] = useState(allDates[allDates.length - 1] ?? "");
  const selectedIdx = allDates.indexOf(selectedDate);
  const dayGames = useMemo(() => games.filter((g) => g.gameDate === selectedDate), [games, selectedDate]);

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
          {dayGames.map((g) => <GameCard key={g.gameId} game={g} />)}
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
