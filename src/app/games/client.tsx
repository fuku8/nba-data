"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { GameResult } from "@/lib/data/games";

export function GamesClient({
  games,
  dates,
}: {
  games: GameResult[];
  dates: string[];
}) {
  const [selectedDate, setSelectedDate] = useState(dates[0] || "");

  const filtered = useMemo(() => {
    if (!selectedDate) return games.slice(-20).reverse();
    return games.filter((g) => g.gameDate === selectedDate);
  }, [games, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">試合結果</h1>
          <p className="text-muted-foreground text-sm">
            {games.length} 試合 · NBA.com · 日付は米国東部時間(ET)基準
          </p>
        </div>
        <Select value={selectedDate} onValueChange={(v) => setSelectedDate(v ?? dates[0])}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="日付を選択" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {dates.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            この日の試合データはありません
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((game, i) => {
            const homeWin = game.homePts > game.awayPts;
            const awayAbbr = game.awayTeam;
            const homeAbbr = game.homeTeam;
            return (
              <Card key={`${game.gameDate}-${i}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">{game.gameDate}</span>
                    <Badge variant="secondary" className="text-xs">Final</Badge>
                  </div>
                  <div className="space-y-2">
                    {/* Away */}
                    <div className={`flex items-center justify-between ${homeWin ? "opacity-60" : ""}`}>
                      <Link
                        href={`/teams/${awayAbbr}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: getTeamColor(awayAbbr) }}
                        />
                        <span className={`font-medium ${!homeWin ? "font-semibold" : ""}`}>
                          {game.awayTeam}
                        </span>
                      </Link>
                      <span className={`font-mono text-lg ${!homeWin ? "font-bold" : ""}`}>
                        {game.awayPts}
                      </span>
                    </div>
                    {/* Home */}
                    <div className={`flex items-center justify-between ${!homeWin ? "opacity-60" : ""}`}>
                      <Link
                        href={`/teams/${homeAbbr}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: getTeamColor(homeAbbr) }}
                        />
                        <span className={`font-medium ${homeWin ? "font-semibold" : ""}`}>
                          {game.homeTeam}
                        </span>
                        <span className="text-xs text-muted-foreground">HOME</span>
                      </Link>
                      <span className={`font-mono text-lg ${homeWin ? "font-bold" : ""}`}>
                        {game.homePts}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
