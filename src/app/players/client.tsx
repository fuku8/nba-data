"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { PlayerPerGame, PlayerAdvanced, SortConfig } from "@/lib/types";

const MIN_GAMES_OPTIONS = [0, 10, 20, 30, 40, 50];
const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"];
const PAGE_SIZE = 50;

export function PlayersClient({
  perGame,
  advanced,
}: {
  perGame: PlayerPerGame[];
  advanced: PlayerAdvanced[];
}) {
  const [search, setSearch] = useState("");
  const [minGames, setMinGames] = useState(20);
  const [posFilter, setPosFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "pts", direction: "desc" });
  const [advSortConfig, setAdvSortConfig] = useState<SortConfig>({ key: "per", direction: "desc" });
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
    setPage(0);
  };

  const handleAdvSort = (key: string) => {
    setAdvSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
    setPage(0);
  };

  const filteredPerGame = useMemo(() => {
    let result = perGame.filter((p) => p.gp >= minGames);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.player.toLowerCase().includes(q));
    }
    if (posFilter !== "All") {
      result = result.filter((p) => p.pos.includes(posFilter));
    }
    return result;
  }, [perGame, search, minGames, posFilter]);

  const sortedPerGame = useMemo(() => {
    return [...filteredPerGame].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof PlayerPerGame] ?? 0;
      const bVal = b[sortConfig.key as keyof PlayerPerGame] ?? 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredPerGame, sortConfig]);

  const filteredAdvanced = useMemo(() => {
    let result = advanced.filter((p) => p.gp >= minGames);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.player.toLowerCase().includes(q));
    }
    if (posFilter !== "All") {
      result = result.filter((p) => p.pos.includes(posFilter));
    }
    return result;
  }, [advanced, search, minGames, posFilter]);

  const sortedAdvanced = useMemo(() => {
    return [...filteredAdvanced].sort((a, b) => {
      const aVal = a[advSortConfig.key as keyof PlayerAdvanced] ?? 0;
      const bVal = b[advSortConfig.key as keyof PlayerAdvanced] ?? 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return advSortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredAdvanced, advSortConfig]);

  const pagedPerGame = sortedPerGame.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedAdvanced = sortedAdvanced.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedPerGame.length / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">選手一覧</h1>
          <p className="text-muted-foreground">
            <Badge variant="outline">{filteredPerGame.length}</Badge> players
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="選手名で検索..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-48"
          />
          <Select value={posFilter} onValueChange={(v) => { setPosFilter(v ?? "All"); setPage(0); }}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>{p === "All" ? "All Pos" : p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(minGames)} onValueChange={(v) => { setMinGames(Number(v ?? "20")); setPage(0); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MIN_GAMES_OPTIONS.map((g) => (
                <SelectItem key={g} value={String(g)}>Min {g} GP</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="basic" onValueChange={() => setPage(0)}>
        <TabsList>
          <TabsTrigger value="basic">Basic Stats</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Pos</TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="GP" sortKey="gp" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="MPG" sortKey="mpg" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="PTS" sortKey="pts" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="REB" sortKey="trb" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="AST" sortKey="ast" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="STL" sortKey="stl" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="BLK" sortKey="blk" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="FG%" sortKey="fgPct" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="3P%" sortKey="threePtPct" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="FT%" sortKey="ftPct" sortConfig={sortConfig} onSort={handleSort} className="justify-end" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPerGame.map((p, i) => (
                      <TableRow key={`${p.player}-${p.team}`} className="hover:bg-accent/50">
                        <TableCell className="text-muted-foreground">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell>
                          <Link href={`/players/${encodeURIComponent(p.player)}`} className="hover:underline font-medium">
                            {p.player}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/teams/${p.team}`} className="flex items-center gap-1.5 hover:underline">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getTeamColor(p.team) }} />
                            {p.team}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.pos}</TableCell>
                        <TableCell className="text-right font-mono">{p.gp}</TableCell>
                        <TableCell className="text-right font-mono">{p.mpg.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{p.pts.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.trb.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.ast.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.stl.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.blk.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.fgPct ? (p.fgPct * 100).toFixed(1) : "-"}</TableCell>
                        <TableCell className="text-right font-mono">{p.threePtPct ? (p.threePtPct * 100).toFixed(1) : "-"}</TableCell>
                        <TableCell className="text-right font-mono">{p.ftPct ? (p.ftPct * 100).toFixed(1) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="GP" sortKey="gp" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="PER" sortKey="per" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="TS%" sortKey="tsPct" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="USG%" sortKey="usgPct" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="OWS" sortKey="ows" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="DWS" sortKey="dws" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="WS" sortKey="ws" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="BPM" sortKey="bpm" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="VORP" sortKey="vorp" sortConfig={advSortConfig} onSort={handleAdvSort} className="justify-end" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedAdvanced.map((p, i) => (
                      <TableRow key={`${p.player}-${p.team}`} className="hover:bg-accent/50">
                        <TableCell className="text-muted-foreground">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell>
                          <Link href={`/players/${encodeURIComponent(p.player)}`} className="hover:underline font-medium">
                            {p.player}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/teams/${p.team}`} className="flex items-center gap-1.5 hover:underline">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getTeamColor(p.team) }} />
                            {p.team}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono">{p.gp}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{p.per.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{(p.tsPct * 100).toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.usgPct.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.ows.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{p.dws.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{p.ws.toFixed(1)}</TableCell>
                        <TableCell className={`text-right font-mono ${p.bpm > 0 ? "text-green-400" : p.bpm < 0 ? "text-red-400" : ""}`}>
                          {p.bpm > 0 ? "+" : ""}{p.bpm.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{p.vorp.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-md text-sm border disabled:opacity-50 hover:bg-accent"
          >
            ← 前
          </button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-md text-sm border disabled:opacity-50 hover:bg-accent"
          >
            次 →
          </button>
        </div>
      )}
    </div>
  );
}
