"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import { SortableHeader } from "@/components/sortable-header";
import type { SortConfig } from "@/lib/types";

interface EnrichedStanding {
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  conferenceGb: string;
  pointsPg: number;
  oppPointsPg: number;
  conference: "East" | "West";
  abbr: string;
  offRating: number;
  defRating: number;
  netRating: number;
  pace: number;
}

function getRankBadge(rank: number) {
  if (rank <= 6) return <Badge variant="default" className="text-xs bg-green-600">Playoff</Badge>;
  if (rank <= 10) return <Badge variant="secondary" className="text-xs">Play-In</Badge>;
  return null;
}

export function StandingsClient({ standings }: { standings: EnrichedStanding[] }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "winPct",
    direction: "desc",
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const sortTeams = (teams: EnrichedStanding[]) => {
    return [...teams].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof EnrichedStanding] ?? 0;
      const bVal = b[sortConfig.key as keyof EnrichedStanding] ?? 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  };

  const east = sortTeams(standings.filter((s) => s.conference === "East"));
  const west = sortTeams(standings.filter((s) => s.conference === "West"));

  const renderTable = (teams: EnrichedStanding[]) => (
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
            <TableHead className="text-right">GB</TableHead>
            <TableHead className="text-right">
              <SortableHeader label="PS/G" sortKey="pointsPg" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader label="PA/G" sortKey="oppPointsPg" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
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
            <TableHead className="text-right">
              <SortableHeader label="Pace" sortKey="pace" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((t, i) => (
            <TableRow key={t.teamName} className="hover:bg-accent/50">
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <Link href={`/teams/${t.abbr}`} className="flex items-center gap-2 hover:underline font-medium">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(t.abbr) }} />
                  {t.teamName}
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono">{t.wins}</TableCell>
              <TableCell className="text-right font-mono">{t.losses}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{t.winPct.toFixed(3)}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">{t.conferenceGb}</TableCell>
              <TableCell className="text-right font-mono">{t.pointsPg.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{t.oppPointsPg.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{t.offRating.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{t.defRating.toFixed(1)}</TableCell>
              <TableCell className={`text-right font-mono font-semibold ${t.netRating > 0 ? "text-green-400" : t.netRating < 0 ? "text-red-400" : ""}`}>
                {t.netRating > 0 ? "+" : ""}{t.netRating.toFixed(1)}
              </TableCell>
              <TableCell className="text-right font-mono">{t.pace.toFixed(1)}</TableCell>
              <TableCell>{getRankBadge(i + 1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">順位表</h1>
      <Tabs defaultValue="east">
        <TabsList>
          <TabsTrigger value="east">Eastern Conference</TabsTrigger>
          <TabsTrigger value="west">Western Conference</TabsTrigger>
        </TabsList>
        <TabsContent value="east">
          <Card>
            <CardHeader>
              <CardTitle>Eastern Conference</CardTitle>
            </CardHeader>
            <CardContent>{renderTable(east)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="west">
          <Card>
            <CardHeader>
              <CardTitle>Western Conference</CardTitle>
            </CardHeader>
            <CardContent>{renderTable(west)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
