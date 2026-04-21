"use client";

import { useState } from "react";
import Link from "next/link";
import { SortableHeader } from "@/components/sortable-header";
import { getTeamColor, getTeamAbbr, NBA_TEAMS } from "@/lib/constants/teams";
import type { PlayoffTeamStats, PlayoffSeries, SortConfig } from "@/lib/types";

const COLS = [
  { key: "pts", label: "PTS" },
  { key: "trb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "tov", label: "TOV" },
  { key: "fgPct", label: "FG%", pct: true },
  { key: "threePtPct", label: "3P%", pct: true },
  { key: "ftPct", label: "FT%", pct: true },
];

export function PlayoffTeamsClient({
  teamStats,
  series,
}: {
  teamStats: PlayoffTeamStats[];
  series: PlayoffSeries[];
}) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "pts", direction: "desc" });

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // シリーズ勝敗集計
  const teamRecords = new Map<string, { w: number; l: number }>();
  for (const s of series) {
    const t1 = getTeamAbbr(s.team1);
    const t2 = getTeamAbbr(s.team2);
    if (!teamRecords.has(t1)) teamRecords.set(t1, { w: 0, l: 0 });
    if (!teamRecords.has(t2)) teamRecords.set(t2, { w: 0, l: 0 });
    if (s.winner) {
      const winner = getTeamAbbr(s.winner);
      const loser = winner === t1 ? t2 : t1;
      teamRecords.get(winner)!.w++;
      teamRecords.get(loser)!.l++;
    }
  }

  const sorted = [...teamStats].sort((a, b) => {
    const av = ((a as unknown) as Record<string, number>)[sortConfig.key] ?? 0;
    const bv = ((b as unknown) as Record<string, number>)[sortConfig.key] ?? 0;
    return sortConfig.direction === "desc" ? bv - av : av - bv;
  });

  const fmt = (v: number, pct?: boolean) => pct ? (v * 100).toFixed(1) + "%" : v.toFixed(1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PO チームスタッツ</h1>
        <p className="text-muted-foreground mt-1">プレーオフ参加チーム スタッツ（選手平均値）</p>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left py-2 px-3 font-medium">チーム</th>
              <th className="py-2 px-3 text-center text-muted-foreground font-medium text-xs w-16">W-L</th>
              {COLS.map((col) => (
                <th key={col.key} className="py-2 px-2 text-right font-medium">
                  <SortableHeader sortKey={col.key} label={col.label} sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const teamInfo = NBA_TEAMS[t.team];
              const rec = teamRecords.get(t.team);
              return (
                <tr key={t.team} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3">
                    <Link href={`/playoffs/teams/${t.team}`} className="flex items-center gap-2 hover:underline font-medium">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: getTeamColor(t.team) }} />
                      <span>{teamInfo?.name ?? t.team}</span>
                      <span className="text-muted-foreground text-xs">{t.team}</span>
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-xs text-muted-foreground">
                    {rec ? `${rec.w}-${rec.l}` : "-"}
                  </td>
                  {COLS.map((col) => {
                    const v = ((t as unknown) as Record<string, number>)[col.key] ?? 0;
                    return (
                      <td key={col.key} className={`py-2 px-2 text-right font-mono text-xs ${col.key === "pts" ? "font-semibold" : ""}`}>
                        {fmt(v, col.pct)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
