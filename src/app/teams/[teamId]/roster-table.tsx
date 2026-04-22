"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SortableHeader } from "@/components/sortable-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeamRosterSortKey, TeamRosterRow } from "@/lib/team-roster-sorting";
import {
  DEFAULT_TEAM_ROSTER_SORT,
  getNextRosterSortConfig,
  sortTeamRosterRows,
} from "@/lib/team-roster-sorting";

export function TeamRosterTable({ rows }: { rows: TeamRosterRow[] }) {
  const [sortConfig, setSortConfig] = useState(DEFAULT_TEAM_ROSTER_SORT);

  const sortedRows = useMemo(() => sortTeamRosterRows(rows, sortConfig), [rows, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) =>
      getNextRosterSortConfig(current, key as TeamRosterSortKey),
    );
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="GP"
                sortKey="gp"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="MPG"
                sortKey="mpg"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="PTS"
                sortKey="pts"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="REB"
                sortKey="trb"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="AST"
                sortKey="ast"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="STL"
                sortKey="stl"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="BLK"
                sortKey="blk"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="FG%"
                sortKey="fgPct"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="3P%"
                sortKey="threePtPct"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="ORtg"
                sortKey="offRating"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="TS%"
                sortKey="tsPct"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={row.player} className="hover:bg-accent/50">
              <TableCell>
                <Link
                  href={`/players/${row.playerId}`}
                  className="hover:underline font-medium"
                >
                  {row.player}
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono">{row.gp}</TableCell>
              <TableCell className="text-right font-mono">{row.mpg.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{row.pts.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{row.trb.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{row.ast.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{row.stl.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{row.blk.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">
                {row.fgPct != null ? `${(row.fgPct * 100).toFixed(1)}%` : "-"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.threePtPct != null ? `${(row.threePtPct * 100).toFixed(1)}%` : "-"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.offRating?.toFixed(1) ?? "-"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {row.tsPct != null ? `${(row.tsPct * 100).toFixed(1)}%` : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
