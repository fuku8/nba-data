"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayerPerGame, PlayerAdvanced } from "@/lib/types";
import { SegmentedName } from "@/components/segmented-name";
import { TOP_N } from "./constants";
import { playerHref } from "@/lib/season-path";

interface LeaderEntry {
  playerId: number;
  player: string;
  team: string;
  value: number;
  format?: "pct" | "plus" | "default";
}

function LeaderBoard({
  title,
  entries,
  pastSeason,
}: {
  title: string;
  entries: LeaderEntry[];
  pastSeason?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={`${e.playerId}-${i}`} className="flex items-center justify-between gap-2 text-sm py-1">
            {/* フル名が長い行は折り返す（切り詰めない）。min-w-0 が無いと値が押し出される。
                バッジは名前と同じインラインフローに置く（flex の隣に置くと2行名で右端へ押し出される） */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-6 text-right text-muted-foreground font-mono shrink-0">{i + 1}</span>
              <div className="min-w-0 leading-snug">
                <Link href={playerHref(e.playerId, pastSeason)} className="font-medium hover:underline">
                  <SegmentedName
                    name={e.player}
                    suffix={
                      <Badge variant="outline" className="text-xs ml-1.5" style={{ borderColor: getTeamColor(e.team) }}>
                        {e.team}
                      </Badge>
                    }
                  />
                </Link>
              </div>
            </div>
            <span className="font-mono font-semibold shrink-0">
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

function makeLeaders<T extends { playerId: number; player: string; team: string }>(
  players: T[],
  getValue: (p: T) => number,
  format?: LeaderEntry["format"],
  desc = true
): LeaderEntry[] {
  return [...players]
    .sort((a, b) => (desc ? getValue(b) - getValue(a) : getValue(a) - getValue(b)))
    .slice(0, TOP_N)
    .map((p) => ({ playerId: p.playerId, player: p.player, team: p.team, value: getValue(p), format }));
}

export function LeadersClient({
  minGp,
  perGame,
  advanced,
  pastSeason,
}: {
  minGp: number;
  perGame: PlayerPerGame[];
  advanced: PlayerAdvanced[];
  pastSeason?: string;
}) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Minimum {minGp} games played</p>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Stats</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LeaderBoard pastSeason={pastSeason} title="Points (PTS)" entries={makeLeaders(perGame, (p) => p.pts)} />
            <LeaderBoard pastSeason={pastSeason} title="Rebounds (REB)" entries={makeLeaders(perGame, (p) => p.trb)} />
            <LeaderBoard pastSeason={pastSeason} title="Assists (AST)" entries={makeLeaders(perGame, (p) => p.ast)} />
            <LeaderBoard pastSeason={pastSeason} title="Steals (STL)" entries={makeLeaders(perGame, (p) => p.stl)} />
            <LeaderBoard pastSeason={pastSeason} title="Blocks (BLK)" entries={makeLeaders(perGame, (p) => p.blk)} />
            <LeaderBoard pastSeason={pastSeason} title="3-Pointers Made (3PM)" entries={makeLeaders(perGame, (p) => p.threePt)} />
          </div>
        </TabsContent>

        <TabsContent value="efficiency">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LeaderBoard pastSeason={pastSeason} title="FG%" entries={makeLeaders(perGame.filter((p) => p.fga >= 5), (p) => p.fgPct, "pct")} />
            <LeaderBoard pastSeason={pastSeason} title="3P%" entries={makeLeaders(perGame.filter((p) => p.threePtA >= 2), (p) => p.threePtPct, "pct")} />
            <LeaderBoard pastSeason={pastSeason} title="FT%" entries={makeLeaders(perGame.filter((p) => p.fta >= 2), (p) => p.ftPct, "pct")} />
            <LeaderBoard pastSeason={pastSeason} title="TS%" entries={makeLeaders(advanced, (p) => p.tsPct, "pct")} />
            <LeaderBoard pastSeason={pastSeason} title="eFG%" entries={makeLeaders(advanced, (p) => p.efgPct, "pct")} />
            <LeaderBoard pastSeason={pastSeason} title="USG%" entries={makeLeaders(advanced, (p) => p.usgPct, "pct")} />
          </div>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LeaderBoard pastSeason={pastSeason} title="Off Rating" entries={makeLeaders(advanced, (p) => p.offRating, "plus")} />
            <LeaderBoard pastSeason={pastSeason} title="Def Rating" entries={makeLeaders(advanced, (p) => p.defRating, undefined, false)} />
            <LeaderBoard pastSeason={pastSeason} title="Net Rating" entries={makeLeaders(advanced, (p) => p.netRating, "plus")} />
            <LeaderBoard pastSeason={pastSeason} title="PIE" entries={makeLeaders(advanced, (p) => p.pie, "pct")} />
            <LeaderBoard pastSeason={pastSeason} title="AST%" entries={makeLeaders(advanced, (p) => p.astPct, "pct")} />
            <LeaderBoard pastSeason={pastSeason} title="REB%" entries={makeLeaders(advanced, (p) => p.rebPct, "pct")} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
