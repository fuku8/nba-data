"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayerPerGame, PlayerAdvanced } from "@/lib/types";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];

export function CompareClient({
  perGame,
  advanced,
}: {
  perGame: PlayerPerGame[];
  advanced: PlayerAdvanced[];
}) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const advMap = useMemo(
    () => new Map(advanced.map((p) => [p.player, p])),
    [advanced]
  );

  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return perGame
      .filter(
        (p) =>
          p.player.toLowerCase().includes(q) &&
          !selectedNames.includes(p.player)
      )
      .slice(0, 8);
  }, [search, perGame, selectedNames]);

  const selectedPlayers = perGame.filter((p) => selectedNames.includes(p.player));

  const addPlayer = (name: string) => {
    if (selectedNames.length < 4 && !selectedNames.includes(name)) {
      setSelectedNames([...selectedNames, name]);
      setSearch("");
    }
  };

  const removePlayer = (name: string) => {
    setSelectedNames(selectedNames.filter((n) => n !== name));
  };

  // Radar data
  const maxPts = Math.max(...perGame.map((p) => p.pts), 1);
  const maxReb = Math.max(...perGame.map((p) => p.trb), 1);
  const maxAst = Math.max(...perGame.map((p) => p.ast), 1);
  const maxStl = Math.max(...perGame.map((p) => p.stl), 1);
  const maxBlk = Math.max(...perGame.map((p) => p.blk), 1);

  const radarData = [
    { stat: "PTS", ...Object.fromEntries(selectedPlayers.map((p) => [p.player, (p.pts / maxPts) * 100])) },
    { stat: "REB", ...Object.fromEntries(selectedPlayers.map((p) => [p.player, (p.trb / maxReb) * 100])) },
    { stat: "AST", ...Object.fromEntries(selectedPlayers.map((p) => [p.player, (p.ast / maxAst) * 100])) },
    { stat: "STL", ...Object.fromEntries(selectedPlayers.map((p) => [p.player, (p.stl / maxStl) * 100])) },
    { stat: "BLK", ...Object.fromEntries(selectedPlayers.map((p) => [p.player, (p.blk / maxBlk) * 100])) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">検索</h1>
      <p className="text-muted-foreground mt-1">最大4名を同時に検索・スタッツを比較できます。</p>

      {/* Search + Selected */}
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Input
            placeholder="選手名を入力（最大4人）..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={selectedNames.length >= 4}
          />
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                {suggestions.map((p) => (
                  <button
                    key={p.player}
                    onClick={() => addPlayer(p.player)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  >
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getTeamColor(p.team) }} />
                    {p.player}
                    <span className="text-muted-foreground">({p.team})</span>
                  </button>
                ))}
              </div>
            )}
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedPlayers.map((p, i) => (
            <Badge
              key={p.player}
              variant="secondary"
              className="text-sm py-1 px-3 gap-1.5"
              style={{ borderLeft: `3px solid ${COLORS[i]}` }}
            >
              {p.player} ({p.team})
              <button onClick={() => removePlayer(p.player)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {selectedPlayers.length >= 2 && (
        <>
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Stats Comparison (Normalized)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="stat" />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  {selectedPlayers.map((p, i) => (
                    <Radar
                      key={p.player}
                      name={p.player}
                      dataKey={p.player}
                      stroke={COLORS[i]}
                      fill={COLORS[i]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Stat</th>
                      {selectedPlayers.map((p, i) => (
                        <th key={p.player} className="text-right py-2 px-3" style={{ color: COLORS[i] }}>
                          {p.player}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "PTS", get: (p: PlayerPerGame) => p.pts.toFixed(1) },
                      { label: "REB", get: (p: PlayerPerGame) => p.trb.toFixed(1) },
                      { label: "AST", get: (p: PlayerPerGame) => p.ast.toFixed(1) },
                      { label: "STL", get: (p: PlayerPerGame) => p.stl.toFixed(1) },
                      { label: "BLK", get: (p: PlayerPerGame) => p.blk.toFixed(1) },
                      { label: "FG%", get: (p: PlayerPerGame) => p.fgPct ? (p.fgPct * 100).toFixed(1) + "%" : "-" },
                      { label: "3P%", get: (p: PlayerPerGame) => p.threePtPct ? (p.threePtPct * 100).toFixed(1) + "%" : "-" },
                      { label: "MPG", get: (p: PlayerPerGame) => p.mpg.toFixed(1) },
                      { label: "GP", get: (p: PlayerPerGame) => String(p.gp) },
                    ].map((row) => (
                      <tr key={row.label} className="border-b hover:bg-accent/30">
                        <td className="py-2 px-3 font-medium">{row.label}</td>
                        {selectedPlayers.map((p) => (
                          <td key={p.player} className="text-right py-2 px-3 font-mono">
                            {row.get(p)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Advanced stats */}
                    <tr className="border-b bg-accent/10">
                      <td colSpan={selectedPlayers.length + 1} className="py-2 px-3 text-xs text-muted-foreground font-semibold">
                        Advanced
                      </td>
                    </tr>
                    {[
                      { label: "PER", get: (name: string) => advMap.get(name)?.per.toFixed(1) ?? "-" },
                      { label: "TS%", get: (name: string) => { const v = advMap.get(name)?.tsPct; return v ? (v * 100).toFixed(1) + "%" : "-"; } },
                      { label: "WS", get: (name: string) => advMap.get(name)?.ws.toFixed(1) ?? "-" },
                      { label: "BPM", get: (name: string) => { const v = advMap.get(name)?.bpm; return v !== undefined ? (v > 0 ? "+" : "") + v.toFixed(1) : "-"; } },
                      { label: "VORP", get: (name: string) => advMap.get(name)?.vorp.toFixed(1) ?? "-" },
                    ].map((row) => (
                      <tr key={row.label} className="border-b hover:bg-accent/30">
                        <td className="py-2 px-3 font-medium">{row.label}</td>
                        {selectedPlayers.map((p) => (
                          <td key={p.player} className="text-right py-2 px-3 font-mono">
                            {row.get(p.player)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedPlayers.length < 2 && selectedPlayers.length > 0 && (
        <p className="text-center text-muted-foreground py-8">
          比較するにはもう1人以上選手を追加してください
        </p>
      )}

      {selectedPlayers.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          上の検索バーから選手を追加してください（最大4人）
        </p>
      )}
    </div>
  );
}
