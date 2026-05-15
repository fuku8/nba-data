"use client";

import { useState } from "react";
import Link from "next/link";
import { SortableHeader } from "@/components/sortable-header";
import type { PlayoffPlayerPerGame, SortConfig } from "@/lib/types";

export interface RosterPlayerRow extends PlayoffPlayerPerGame {
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
}

const COLS: { key: string; label: string; pct?: boolean; int?: boolean; sign?: boolean }[] = [
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
  { key: "offRating", label: "ORtg" },
  { key: "defRating", label: "DRtg" },
  { key: "netRating", label: "NRtg", sign: true },
];

export function RosterClient({ players }: { players: RosterPlayerRow[] }) {
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

  const fmt = (v: number | null, pct?: boolean, int?: boolean, sign?: boolean) => {
    if (v == null) return "-";
    if (pct) return (v * 100).toFixed(1) + "%";
    if (int) return String(Math.round(v));
    if (sign) return (v > 0 ? "+" : "") + v.toFixed(1);
    return v.toFixed(1);
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="text-left py-2 px-3 font-medium sticky left-0 bg-muted/50">選手</th>
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
                <Link href={`/players/${p.playerId}`} className="hover:underline">{p.player}</Link>
              </td>
              {COLS.map((col) => {
                const v = ((p as unknown) as Record<string, number | null>)[col.key] ?? null;
                return (
                  <td key={col.key} className="py-2 px-2 text-right font-mono text-xs">{fmt(v, col.pct, col.int, col.sign)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
