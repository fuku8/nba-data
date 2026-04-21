"use client";

import { useState } from "react";
import Link from "next/link";
import { SortableHeader } from "@/components/sortable-header";
import type { PlayoffPlayerPerGame, SortConfig } from "@/lib/types";

const COLS: { key: string; label: string; pct?: boolean; int?: boolean }[] = [
  { key: "gp", label: "G", int: true },
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

export function RosterClient({ players }: { players: PlayoffPlayerPerGame[] }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "pts", direction: "desc" });

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const sorted = [...players].sort((a, b) => {
    const av = ((a as unknown) as Record<string, number>)[sortConfig.key] ?? 0;
    const bv = ((b as unknown) as Record<string, number>)[sortConfig.key] ?? 0;
    return sortConfig.direction === "desc" ? bv - av : av - bv;
  });

  const fmt = (v: number, pct?: boolean, int?: boolean) =>
    pct ? (v * 100).toFixed(1) + "%" : int ? String(Math.round(v)) : v.toFixed(1);

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="text-left py-2 px-3 font-medium sticky left-0 bg-muted/50">選手</th>
            <th className="py-2 px-2 text-center text-muted-foreground font-medium w-8">POS</th>
            {COLS.map((col) => (
              <th key={col.key} className="py-2 px-2 text-right font-medium">
                <SortableHeader sortKey={col.key} label={col.label} sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={`${p.player}-${p.team}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 font-medium sticky left-0 bg-background">
                <Link href={`/players/${encodeURIComponent(p.player)}`} className="hover:underline">{p.player}</Link>
              </td>
              <td className="py-2 px-2 text-center text-muted-foreground text-xs">{p.pos}</td>
              {COLS.map((col) => {
                const v = ((p as unknown) as Record<string, number>)[col.key] ?? 0;
                return (
                  <td key={col.key} className="py-2 px-2 text-right font-mono text-xs">{fmt(v, col.pct, col.int)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
