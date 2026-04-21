"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayoffPlayerPerGame } from "@/lib/types";

const TOP_N = 10;

interface LeaderEntry {
  player: string;
  team: string;
  value: number;
  format?: "pct" | "default";
}

function LeaderBoard({ title, entries }: { title: string; entries: LeaderEntry[] }) {
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
              <Link href={`/players/${encodeURIComponent(e.player)}`} className="font-medium hover:underline truncate max-w-[130px]">
                {e.player}
              </Link>
              <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: getTeamColor(e.team) }}>
                {e.team}
              </Badge>
            </div>
            <span className="font-mono font-semibold">
              {e.format === "pct" ? (e.value * 100).toFixed(1) + "%" : e.value.toFixed(1)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function makeLeaders(
  players: PlayoffPlayerPerGame[],
  getValue: (p: PlayoffPlayerPerGame) => number,
  filter?: (p: PlayoffPlayerPerGame) => boolean,
  format?: LeaderEntry["format"]
): LeaderEntry[] {
  const pool = filter ? players.filter(filter) : players;
  return [...pool]
    .sort((a, b) => getValue(b) - getValue(a))
    .slice(0, TOP_N)
    .map((p) => ({ player: p.player, team: p.team, value: getValue(p), format }));
}

export function PlayoffLeadersClient({ players }: { players: PlayoffPlayerPerGame[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PO リーダーズ</h1>
        <p className="text-muted-foreground mt-1">プレーオフ スタッツリーダー（上位10名）</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LeaderBoard title="得点 (PTS)" entries={makeLeaders(players, (p) => p.pts)} />
        <LeaderBoard title="リバウンド (TRB)" entries={makeLeaders(players, (p) => p.trb)} />
        <LeaderBoard title="アシスト (AST)" entries={makeLeaders(players, (p) => p.ast)} />
        <LeaderBoard title="スティール (STL)" entries={makeLeaders(players, (p) => p.stl)} />
        <LeaderBoard title="ブロック (BLK)" entries={makeLeaders(players, (p) => p.blk)} />
        <LeaderBoard title="3ポイント成功数 (3PM)" entries={makeLeaders(players, (p) => p.threePt)} />
        <LeaderBoard title="FG%" entries={makeLeaders(players, (p) => p.fgPct, (p) => p.fga >= 3, "pct")} />
        <LeaderBoard title="3P%" entries={makeLeaders(players, (p) => p.threePtPct, (p) => p.threePtA >= 2, "pct")} />
        <LeaderBoard title="FT%" entries={makeLeaders(players, (p) => p.ftPct, (p) => p.fta >= 2, "pct")} />
      </div>
    </div>
  );
}
