import type { SortConfig } from "@/lib/types";

export type TeamRosterSortKey =
  | "gp"
  | "mpg"
  | "pts"
  | "trb"
  | "ast"
  | "stl"
  | "blk"
  | "fgPct"
  | "threePtPct"
  | "offRating"
  | "tsPct";

export interface TeamRosterRow {
  playerId: number;
  player: string;
  gp: number;
  mpg: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  fgPct: number;
  threePtPct: number;
  offRating: number | null;
  tsPct: number | null;
}

export const DEFAULT_TEAM_ROSTER_SORT: SortConfig = {
  key: "pts",
  direction: "desc",
};

export function getNextRosterSortConfig(
  current: SortConfig,
  key: TeamRosterSortKey,
): SortConfig {
  return {
    key,
    direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
  };
}

export function sortTeamRosterRows(
  rows: TeamRosterRow[],
  sortConfig: SortConfig,
): TeamRosterRow[] {
  const key = sortConfig.key as TeamRosterSortKey;

  return [...rows].sort((a, b) => {
    const aValue = getComparableValue(a, key);
    const bValue = getComparableValue(b, key);

    return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
  });
}

function getComparableValue(row: TeamRosterRow, key: TeamRosterSortKey): number {
  const value = row[key];
  return typeof value === "number" ? value : 0;
}
