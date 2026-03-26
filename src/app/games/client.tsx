"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";

interface GameData {
  id: number;
  date: string;
  status: string;
  home_team: { abbreviation: string; full_name: string };
  visitor_team: { abbreviation: string; full_name: string };
  home_team_score: number;
  visitor_team_score: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function GamesClient() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/games?date=${date}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setGames(data.games || []);
      } catch {
        setError("試合データの取得に失敗しました。API キーが設定されていない可能性があります。");
        setGames([]);
      }
      setLoading(false);
    };
    fetchGames();
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">試合結果</h1>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
      </div>

      {loading && (
        <div className="text-center text-muted-foreground py-8">読み込み中...</div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && games.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {formatDate(date)} の試合はありません
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => {
          const homeWin = game.home_team_score > game.visitor_team_score;
          const isFinal = game.status === "Final";
          return (
            <Card key={game.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{formatDate(game.date)}</span>
                  <Badge variant={isFinal ? "secondary" : "default"} className="text-xs">
                    {game.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className={`flex items-center justify-between ${!homeWin && isFinal ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getTeamColor(game.visitor_team.abbreviation) }}
                      />
                      <span className={`font-medium ${!homeWin && isFinal ? "" : "font-semibold"}`}>
                        {game.visitor_team.full_name}
                      </span>
                    </div>
                    <span className="font-mono text-lg font-bold">{game.visitor_team_score}</span>
                  </div>
                  <div className={`flex items-center justify-between ${homeWin && isFinal ? "" : isFinal ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getTeamColor(game.home_team.abbreviation) }}
                      />
                      <span className={`font-medium ${homeWin && isFinal ? "font-semibold" : ""}`}>
                        {game.home_team.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">HOME</span>
                    </div>
                    <span className="font-mono text-lg font-bold">{game.home_team_score}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
