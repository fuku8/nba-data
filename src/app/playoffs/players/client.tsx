"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/sortable-header";
import { getTeamColor } from "@/lib/constants/teams";
import type { PlayoffPlayerPerGame, SortConfig } from "@/lib/types";

const PAGE_SIZE = 50;

export function PlayoffPlayersClient({ players }: { players: PlayoffPlayerPerGame[] }) {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "pts", direction: "desc" });
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const pool = q ? players.filter((p) => p.player.toLowerCase().includes(q)) : players;
    return [...pool].sort((a, b) => {
      const av = ((a as unknown) as Record<string, number>)[sortConfig.key] ?? 0;
      const bv = ((b as unknown) as Record<string, number>)[sortConfig.key] ?? 0;
      return sortConfig.direction === "desc" ? bv - av : av - bv;
    });
  }, [players, search, sortConfig]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const th = (key: string, label: string) => (
    <SortableHeader sortKey={key} label={label} sortConfig={sortConfig} onSort={handleSort} />
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PO 選手スタッツ</h1>
        <p className="text-muted-foreground mt-1">プレーオフ per game スタッツ</p>
      </div>

      <Input
        placeholder="選手名で検索..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="max-w-sm"
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">選手</TableHead>
              <TableHead>チーム</TableHead>
              <TableHead>{th("gp", "G")}</TableHead>
              <TableHead>{th("pts", "PTS")}</TableHead>
              <TableHead>{th("trb", "REB")}</TableHead>
              <TableHead>{th("ast", "AST")}</TableHead>
              <TableHead>{th("stl", "STL")}</TableHead>
              <TableHead>{th("blk", "BLK")}</TableHead>
              <TableHead>{th("fgPct", "FG%")}</TableHead>
              <TableHead>{th("threePtPct", "3P%")}</TableHead>
              <TableHead>{th("ftPct", "FT%")}</TableHead>
              <TableHead>{th("mpg", "MIN")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((p) => (
              <TableRow key={`${p.player}-${p.team}`}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  <Link href={`/players/${encodeURIComponent(p.player)}`} className="hover:underline">{p.player}</Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: getTeamColor(p.team) }}>{p.team}</Badge>
                </TableCell>
                <TableCell>{p.gp}</TableCell>
                <TableCell className="font-semibold">{p.pts.toFixed(1)}</TableCell>
                <TableCell>{p.trb.toFixed(1)}</TableCell>
                <TableCell>{p.ast.toFixed(1)}</TableCell>
                <TableCell>{p.stl.toFixed(1)}</TableCell>
                <TableCell>{p.blk.toFixed(1)}</TableCell>
                <TableCell>{(p.fgPct * 100).toFixed(1)}%</TableCell>
                <TableCell>{(p.threePtPct * 100).toFixed(1)}%</TableCell>
                <TableCell>{(p.ftPct * 100).toFixed(1)}%</TableCell>
                <TableCell>{p.mpg.toFixed(1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded border disabled:opacity-40">前へ</button>
          <span className="text-muted-foreground">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-3 py-1 rounded border disabled:opacity-40">次へ</button>
        </div>
      )}
    </div>
  );
}
