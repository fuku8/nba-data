"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayoffPlayerPerGame } from "@/lib/types";

const MAX_PLAYERS = 4;

const STAT_ROWS: { key: keyof PlayoffPlayerPerGame; label: string; pct?: boolean }[] = [
  { key: "gp", label: "Games" },
  { key: "pts", label: "PTS" },
  { key: "trb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "tov", label: "TOV" },
  { key: "fgPct", label: "FG%", pct: true },
  { key: "threePtPct", label: "3P%", pct: true },
  { key: "ftPct", label: "FT%", pct: true },
  { key: "mpg", label: "MIN" },
];

export function PlayoffCompareClient({ players }: { players: PlayoffPlayerPerGame[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlayoffPlayerPerGame[]>([]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const selectedNames = new Set(selected.map((p) => p.player));
    return players.filter((p) => p.player.toLowerCase().includes(q) && !selectedNames.has(p.player)).slice(0, 8);
  }, [players, query, selected]);

  const addPlayer = (p: PlayoffPlayerPerGame) => {
    if (selected.length >= MAX_PLAYERS) return;
    setSelected((prev) => [...prev, p]);
    setQuery("");
  };

  const removePlayer = (name: string) => {
    setSelected((prev) => prev.filter((p) => p.player !== name));
  };

  const fmt = (p: PlayoffPlayerPerGame, key: keyof PlayoffPlayerPerGame, pct?: boolean) => {
    const v = p[key] as number;
    if (pct) return (v * 100).toFixed(1) + "%";
    if (key === "gp") return String(Math.round(v));
    return typeof v === "number" ? v.toFixed(1) : String(v);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">検索</h1>
        <p className="text-muted-foreground mt-1">最大4名を同時に検索・スタッツを比較できます。</p>
      </div>

      {selected.length < MAX_PLAYERS && (
        <div className="relative max-w-sm">
          <Input
            placeholder="選手名を入力して追加..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-10">
              {suggestions.map((p) => (
                <button
                  key={`${p.player}-${p.team}`}
                  onClick={() => addPlayer(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                >
                  <span>{p.player}</span>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: getTeamColor(p.team) }}>{p.team}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-muted-foreground text-sm">選手を検索して追加してください（最大4名）</p>
      )}

      {selected.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium w-20">スタッツ</th>
                {selected.map((p) => (
                  <th key={p.player} className="py-2 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold" style={{ color: getTeamColor(p.team) }}>{p.player}</span>
                        <button onClick={() => removePlayer(p.player)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: getTeamColor(p.team) }}>{p.team}</Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAT_ROWS.map((row) => {
                const values = selected.map((p) => p[row.key] as number);
                const best = row.key === "tov" ? Math.min(...values) : Math.max(...values);
                return (
                  <tr key={row.key} className="border-t">
                    <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                    {selected.map((p) => {
                      const v = p[row.key] as number;
                      const isBest = selected.length > 1 && v === best;
                      return (
                        <td key={p.player} className={`py-2 px-3 text-center font-mono ${isBest ? "font-bold text-orange-400" : ""}`}>
                          {fmt(p, row.key, row.pct)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
