import test from "node:test";
import assert from "node:assert/strict";

import { buildBracket, type SeedInfo } from "./bracket.ts";
import { readCsvFile, csvToObjects, num } from "./data/csv-utils.ts";
import type { PlayoffSeries } from "./types.ts";

// 2025-26 の実データ（data/2025-26/）で16シリーズが木の正しい位置に入ることを確認する
const SEASON = "2025-26";

function load() {
  const series: PlayoffSeries[] = csvToObjects(readCsvFile("po_series.csv", SEASON)).map((d) => ({
    team1: d["team1"], team2: d["team2"], team1Wins: num(d["team1_wins"]), team2Wins: num(d["team2_wins"]),
    winner: d["winner"], seriesStatus: d["series_status"], round: num(d["round"]), roundName: d["round_name"],
    firstGameDate: d["first_game_date"], lastGameDate: d["last_game_date"],
  }));
  const seeds = new Map<string, SeedInfo>();
  for (const d of csvToObjects(readCsvFile("standings.csv", SEASON))) {
    seeds.set(d["TEAM_ABBREVIATION"], { conference: d["CONFERENCE"] as "East" | "West", seed: num(d["PLAYOFF_RANK"]) });
  }
  return { series, seeds };
}

const pair = (s: { team1: string; team2: string } | null) => (s ? [s.team1, s.team2].sort().join("-") : null);

test("buildBracket: 2025-26 の15シリーズが全て配置され、ファイナルが中央", () => {
  const { series, seeds } = load();
  const b = buildBracket(series, seeds, (t) => t);
  assert.equal(b.unplaced.length, 0);
  assert.equal(pair(b.finals), "NYK-SAS");
  // West 1回戦: 1-8 / 4-5 / 3-6 / 2-7 の順（7・8シードはプレーインで入れ替わるが上位シードで決まる）
  assert.deepEqual(b.west[0].map(pair), ["OKC-PHX", "HOU-LAL", "DEN-MIN", "POR-SAS"]);
  assert.deepEqual(b.east[0].map(pair), ["DET-ORL", "CLE-TOR", "ATL-NYK", "BOS-PHI"]);
  // 2回戦は1回戦の枠0+1、枠2+3の勝者同士
  assert.deepEqual(b.west[1].map(pair), ["LAL-OKC", "MIN-SAS"]);
  assert.deepEqual(b.east[1].map(pair), ["CLE-DET", "NYK-PHI"]);
  assert.deepEqual(b.west[2].map(pair), ["OKC-SAS"]);
  assert.deepEqual(b.east[2].map(pair), ["CLE-NYK"]);
});

test("buildBracket: 進行中（1回戦のみ）でも空枠が null で残る", () => {
  const { series, seeds } = load();
  const b = buildBracket(series.filter((s) => s.round === 1), seeds, (t) => t);
  assert.equal(b.finals, null);
  assert.deepEqual(b.west[1], [null, null]);
  assert.deepEqual(b.east[2], [null]);
  assert.equal(b.west[0].filter(Boolean).length, 4);
});

test("buildBracket: シード不明のシリーズは unplaced に落ちる", () => {
  const { series } = load();
  const b = buildBracket(series, new Map(), (t) => t);
  assert.equal(b.unplaced.length, 14); // 15シリーズ（8+4+2+1）のうちファイナルだけはシード不要で配置される
  assert.equal(pair(b.finals), "NYK-SAS");
});
