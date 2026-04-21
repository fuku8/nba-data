"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayoffPlayerPerGame } from "@/lib/types";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

function PlayerCard({ p }: { p: PlayoffPlayerPerGame }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Link href={`/players/${encodeURIComponent(p.player)}`} className="font-semibold hover:underline text-base">
              {p.player}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">{p.pos} · {p.gp}G</p>
          </div>
          <Badge variant="outline" style={{ borderColor: getTeamColor(p.team) }}>{p.team}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <StatRow label="PTS" value={p.pts.toFixed(1)} />
          <StatRow label="REB" value={p.trb.toFixed(1)} />
          <StatRow label="AST" value={p.ast.toFixed(1)} />
          <StatRow label="STL" value={p.stl.toFixed(1)} />
          <StatRow label="BLK" value={p.blk.toFixed(1)} />
          <StatRow label="FG%" value={(p.fgPct * 100).toFixed(1) + "%"} />
          <StatRow label="3P%" value={(p.threePtPct * 100).toFixed(1) + "%"} />
          <StatRow label="MIN" value={p.mpg.toFixed(1)} />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayoffSearchClient({ players }: { players: PlayoffPlayerPerGame[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return players.filter((p) => p.player.toLowerCase().includes(q)).slice(0, 20);
  }, [players, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PO 選手検索</h1>
        <p className="text-muted-foreground mt-1">プレーオフ出場選手を検索</p>
      </div>

      <Input
        placeholder="選手名を入力..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
        autoFocus
      />

      {query && results.length === 0 && (
        <p className="text-muted-foreground text-sm">「{query}」に一致する選手が見つかりません</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((p) => <PlayerCard key={`${p.player}-${p.team}`} p={p} />)}
      </div>
    </div>
  );
}
