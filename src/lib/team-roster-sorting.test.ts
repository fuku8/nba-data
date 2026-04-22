import test from "node:test";
import assert from "node:assert/strict";

import {
  getNextRosterSortConfig,
  sortTeamRosterRows,
  type TeamRosterRow,
} from "./team-roster-sorting.ts";

const rows: TeamRosterRow[] = [
  {
    playerId: 1001,
    player: "Alpha Guard",
    gp: 82,
    mpg: 34.5,
    pts: 24.1,
    trb: 4.2,
    ast: 9.8,
    stl: 1.4,
    blk: 0.2,
    fgPct: 0.51,
    threePtPct: 0.39,
    offRating: 118.4,
    tsPct: 0.62,
  },
  {
    playerId: 1002,
    player: "Bravo Wing",
    gp: 76,
    mpg: 31.2,
    pts: 18.6,
    trb: 7.1,
    ast: 3.9,
    stl: 1.1,
    blk: 0.7,
    fgPct: 0.47,
    threePtPct: 0.41,
    offRating: null,
    tsPct: null,
  },
  {
    playerId: 1003,
    player: "Charlie Big",
    gp: 70,
    mpg: 29.8,
    pts: 16.9,
    trb: 11.3,
    ast: 2.5,
    stl: 0.8,
    blk: 1.9,
    fgPct: 0.58,
    threePtPct: 0.0,
    offRating: 112.7,
    tsPct: 0.71,
  },
];

test("sortTeamRosterRows defaults to points descending order", () => {
  const sorted = sortTeamRosterRows(rows, { key: "pts", direction: "desc" });
  assert.deepEqual(
    sorted.map((row) => row.player),
    ["Alpha Guard", "Bravo Wing", "Charlie Big"],
  );
});

test("sortTeamRosterRows sorts numeric fields ascending", () => {
  const sorted = sortTeamRosterRows(rows, { key: "trb", direction: "asc" });
  assert.deepEqual(
    sorted.map((row) => row.player),
    ["Alpha Guard", "Bravo Wing", "Charlie Big"],
  );
});

test("sortTeamRosterRows places players with null advanced stats last when sorting descending", () => {
  const sorted = sortTeamRosterRows(rows, { key: "offRating", direction: "desc" });
  assert.deepEqual(
    sorted.map((row) => row.player),
    ["Alpha Guard", "Charlie Big", "Bravo Wing"],
  );
});

test("sortTeamRosterRows treats fgPct of 0.0 as a real value, not as missing data", () => {
  // Charlie Big has threePtPct: 0.0 — should sort before players with null stats (per: null)
  const sorted = sortTeamRosterRows(rows, { key: "threePtPct", direction: "asc" });
  assert.deepEqual(
    sorted.map((row) => row.player),
    ["Charlie Big", "Alpha Guard", "Bravo Wing"],
  );
});

test("getNextRosterSortConfig flips direction for the active key", () => {
  assert.deepEqual(
    getNextRosterSortConfig({ key: "pts", direction: "desc" }, "pts"),
    { key: "pts", direction: "asc" },
  );
});

test("getNextRosterSortConfig resets a new key to descending", () => {
  assert.deepEqual(
    getNextRosterSortConfig({ key: "pts", direction: "asc" }, "tsPct"),
    { key: "tsPct", direction: "desc" },
  );
});
