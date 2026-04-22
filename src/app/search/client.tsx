"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";
import type { PlayerPerGame, PlayerAdvanced } from "@/lib/types";

export function SearchClient({
  perGame,
  advanced,
}: {
  perGame: PlayerPerGame[];
  advanced: PlayerAdvanced[];
}) {
  const [query, setQuery] = useState("");

  const advMap = useMemo(
    () => new Map(advanced.map((p) => [p.player, p])),
    [advanced]
  );

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return perGame
      .filter((p) => p.player.toLowerCase().includes(q))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 30);
  }, [query, perGame]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">選手検索</h1>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="選手名を入力（2文字以上）..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => {
            const adv = advMap.get(p.player);
            const teamInfo = getTeamInfo(p.team);
            return (
              <Link key={`${p.player}-${p.team}`} href={`/players/${p.playerId}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold">{p.player}</div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: getTeamColor(p.team) }}
                          />
                          {teamInfo?.name ?? p.team}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{p.team}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">PTS</div>
                        <div className="font-mono font-semibold">{p.pts.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">REB</div>
                        <div className="font-mono">{p.trb.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">AST</div>
                        <div className="font-mono">{p.ast.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">GP</div>
                        <div className="font-mono">{p.gp}</div>
                      </div>
                    </div>
                    {adv && (
                      <div className="grid grid-cols-3 gap-2 text-center text-sm mt-2 pt-2 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground">ORtg</div>
                          <div className="font-mono">{adv.offRating.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">NRtg</div>
                          <div className="font-mono">
                            {adv.netRating > 0 ? "+" : ""}{adv.netRating.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">TS%</div>
                          <div className="font-mono">{(adv.tsPct * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          「{query}」に該当する選手が見つかりません
        </p>
      )}
    </div>
  );
}
