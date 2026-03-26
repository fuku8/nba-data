"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayerPerGame, PlayerAdvanced } from "@/lib/types";

const TOP_N = 20;

interface LeaderEntry {
  player: string;
  team: string;
  value: number;
  format?: "pct" | "plus" | "default";
}

function LeaderBoard({
  title,
  entries,
}: {
  title: string;
  entries: LeaderEntry[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={`${e.player}-${i}`} className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-2">
              <span className="w-6 text-right text-muted-foreground font-mono">{i + 1}</span>
              <Link href={`/players/${encodeURIComponent(e.player)}`} className="font-medium hover:underline">
                {e.player}
              </Link>
              <Badge variant="outline" className="text-xs" style={{ borderColor: getTeamColor(e.team) }}>
                {e.team}
              </Badge>
            </div>
            <span className="font-mono font-semibold">
              {e.format === "pct"
                ? (e.value * 100).toFixed(1) + "%"
                : e.format === "plus"
                  ? (e.value > 0 ? "+" : "") + e.value.toFixed(1)
                  : e.value.toFixed(1)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function makeLeaders<T extends { player: string; team: string }>(
  players: T[],
  getValue: (p: T) => number,
  format?: LeaderEntry["format"],
  desc = true
): LeaderEntry[] {
  return [...players]
    .sort((a, b) => (desc ? getValue(b) - getValue(a) : getValue(a) - getValue(b)))
    .slice(0, TOP_N)
    .map((p) => ({ player: p.player, team: p.team, value: getValue(p), format }));
}

export function LeadersClient({
  perGame,
  advanced,
}: {
  perGame: PlayerPerGame[];
  advanced: PlayerAdvanced[];
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">League Leaders</h1>
      <p className="text-muted-foreground">Minimum 30 games played</p>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Stats</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LeaderBoard title="Points (PTS)" entries={makeLeaders(perGame, (p) => p.pts)} />
            <LeaderBoard title="Rebounds (REB)" entries={makeLeaders(perGame, (p) => p.trb)} />
            <LeaderBoard title="Assists (AST)" entries={makeLeaders(perGame, (p) => p.ast)} />
            <LeaderBoard title="Steals (STL)" entries={makeLeaders(perGame, (p) => p.stl)} />
            <LeaderBoard title="Blocks (BLK)" entries={makeLeaders(perGame, (p) => p.blk)} />
            <LeaderBoard title="3-Pointers Made (3PM)" entries={makeLeaders(perGame, (p) => p.threePt)} />
          </div>
        </TabsContent>

        <TabsContent value="efficiency">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LeaderBoard title="FG%" entries={makeLeaders(perGame.filter((p) => p.fga >= 5), (p) => p.fgPct, "pct")} />
            <LeaderBoard title="3P%" entries={makeLeaders(perGame.filter((p) => p.threePtA >= 2), (p) => p.threePtPct, "pct")} />
            <LeaderBoard title="FT%" entries={makeLeaders(perGame.filter((p) => p.fta >= 2), (p) => p.ftPct, "pct")} />
            <LeaderBoard title="TS%" entries={makeLeaders(advanced, (p) => p.tsPct, "pct")} />
            <LeaderBoard title="eFG%" entries={makeLeaders(advanced, (p) => p.efgPct, "pct")} />
            <LeaderBoard title="PER" entries={makeLeaders(advanced, (p) => p.per)} />
          </div>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LeaderBoard title="Win Shares (WS)" entries={makeLeaders(advanced, (p) => p.ws)} />
            <LeaderBoard title="WS/48" entries={makeLeaders(advanced, (p) => p.wsPer48)} />
            <LeaderBoard title="BPM" entries={makeLeaders(advanced, (p) => p.bpm, "plus")} />
            <LeaderBoard title="OBPM" entries={makeLeaders(advanced, (p) => p.obpm, "plus")} />
            <LeaderBoard title="DBPM" entries={makeLeaders(advanced, (p) => p.dbpm, "plus")} />
            <LeaderBoard title="VORP" entries={makeLeaders(advanced, (p) => p.vorp)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
