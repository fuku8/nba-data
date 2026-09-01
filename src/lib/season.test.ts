import test from "node:test";
import assert from "node:assert/strict";
import path from "path";

import { currentSeason, allSeasons, resolveSeason, seasonDir, poYear } from "./season.ts";
import { readCsvFile } from "./data/csv-utils.ts";

test("currentSeason: data/season.txt の値を返す（YYYY-YY形式）", () => {
  assert.match(currentSeason(), /^\d{4}-\d{2}$/);
  assert.equal(allSeasons()[0], currentSeason());
});

test("resolveSeason: 未指定・不明は現シーズン、既知の過去シーズンはそのまま", () => {
  const cur = currentSeason();
  assert.equal(resolveSeason(undefined), cur);
  assert.equal(resolveSeason(null), cur);
  assert.equal(resolveSeason("1999-00"), cur);
  assert.equal(resolveSeason("../etc"), cur);
  for (const s of allSeasons()) assert.equal(resolveSeason(s), s);
});

test("seasonDir: 現シーズンは data/、過去は data/<season>/", () => {
  assert.equal(seasonDir(currentSeason()), path.join(process.cwd(), "data"));
  assert.equal(seasonDir("2025-26") === path.join(process.cwd(), "data"), currentSeason() === "2025-26");
});

test("readCsvFile: 過去シーズン指定で data/<season>/ を読み、ヘッダーが現行と一致する", () => {
  const archived = allSeasons().filter((s) => s !== currentSeason());
  for (const s of archived) {
    const rows = readCsvFile("standings.csv", s);
    assert.ok(rows.length > 1, `${s}/standings.csv が空`);
    assert.deepEqual(rows[0], readCsvFile("standings.csv")[0]);
  }
});

test("poYear: 2025-26 → 2026", () => {
  assert.equal(poYear("2025-26"), 2026);
  assert.equal(poYear("2099-00"), 2100);
});
