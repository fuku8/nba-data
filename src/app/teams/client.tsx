"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableHeader } from "@/components/sortable-header";
import { getTeamColor } from "@/lib/constants/teams";
import type { SortConfig } from "@/lib/types";

interface TeamSummary {
  name: string;
  abbr: string;
  conference: "East" | "West";
  wins: number;
  losses: number;
  winPct: number;
  pts: number;
  reb: number;
  ast: number;
  offRating: number;
  defRating: number;
  netRating: number;
  pace: number;
}

export function TeamsClient({ teams }: { teams: TeamSummary[] }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "winPct", direction: "desc" });
  const [confFilter, setConfFilter] = useState<string>("all");

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const filtered = teams.filter((t) => confFilter === "all" || t.conference === confFilter);
  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortConfig.key as keyof TeamSummary] ?? 0;
    const bVal = b[sortConfig.key as keyof TeamSummary] ?? 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">チーム一覧</h1>
        <Select value={confFilter} onValueChange={(v) => setConfFilter(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conferences</SelectItem>
            <SelectItem value="East">Eastern</SelectItem>
            <SelectItem value="West">Western</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="W" sortKey="wins" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="L" sortKey="losses" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="W%" sortKey="winPct" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="PTS" sortKey="pts" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="REB" sortKey="reb" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="AST" sortKey="ast" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="ORtg" sortKey="offRating" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="DRtg" sortKey="defRating" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader label="NRtg" sortKey="netRating" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((t, i) => (
                  <TableRow key={t.abbr} className="hover:bg-accent/50">
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <Link href={`/teams/${t.abbr}`} className="flex items-center gap-2 hover:underline font-medium">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(t.abbr) }} />
                        {t.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono">{t.wins}</TableCell>
                    <TableCell className="text-right font-mono">{t.losses}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{t.winPct.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono">{t.pts.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{t.reb.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{t.ast.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{t.offRating.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{t.defRating.toFixed(1)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${t.netRating > 0 ? "text-green-400" : t.netRating < 0 ? "text-red-400" : ""}`}>
                      {t.netRating > 0 ? "+" : ""}{t.netRating.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
