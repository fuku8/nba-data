// 選手タイプ分類とタイプ評価点（feel-viz Phase 5）
//
// タイプ判定 = スタイル特徴（何をする選手か）のzスコアが1.0以上のタイプを最大3つ付与。
// タイプ評価点 = そのタイプの職務に対応するパーセンタイルの加重平均（0-1）。
// 「下手なスコアラー型」が正直に低得点になるよう、判定と評価は分離している。

import fs from "fs";
import path from "path";
import { readCsvFile, csvToObjects, num } from "./csv-utils";
import { percentileOf } from "@/components/percentile-bars";

export type Season = "rs" | "po";

export interface TypeBadge {
  type: string;
  score: number; // 0-1
}

export interface PoSwing {
  delta: number; // TS%変化 − リーグ（対象プール）平均変化。単位は割合（0.09 = +9pt）
  gp: number;
}

// 特徴キー: パーセンタイル化して使う
const FEAT_KEYS = [
  "pts", "reb", "ast", "stl", "blk", "fg3m", "fg3pct", "ts", "usg", "astp", "pie",
  "share3", "rim", "poss", "defl", "cont", "scr", "loose", "box", "chg",
] as const;
type FeatKey = (typeof FEAT_KEYS)[number];
type Get = (k: FeatKey) => number;

const mean = (...xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// 5部門の水準×均等さ（オールラウンダー用）
function versat(g: Get): number {
  const ps = [g("pts"), g("reb"), g("ast"), g("stl"), g("blk")];
  const m = mean(...ps);
  const sd = Math.sqrt(ps.reduce((a, p) => a + (p - m) ** 2, 0) / ps.length);
  return m * (1 - sd);
}

// style: タイプらしさ（形）/ score: そのタイプとしての職務評価
const TYPE_DEFS: { name: string; style: (g: Get) => number; score: (g: Get) => number }[] = [
  { name: "スコアラー", style: (g) => mean(g("usg"), g("pts")), score: (g) => mean(g("pts"), g("ts"), g("pie")) },
  { name: "司令塔", style: (g) => mean(g("astp"), g("poss")), score: (g) => mean(g("ast"), g("pie"), g("ts")) },
  { name: "シューター", style: (g) => mean(g("share3"), g("fg3m")), score: (g) => mean(g("fg3m"), g("fg3pct"), g("ts")) },
  { name: "3&D", style: (g) => mean(g("share3"), g("stl"), g("defl"), g("cont")), score: (g) => mean(g("fg3pct"), g("stl"), g("defl"), g("cont")) },
  { name: "ゴール下の番人", style: (g) => mean(g("rim"), g("blk"), g("box")), score: (g) => mean(g("blk"), g("reb"), g("cont"), g("box")) },
  { name: "ハッスル職人", style: (g) => mean(g("defl"), g("loose"), g("chg"), g("scr"), g("box")), score: (g) => mean(g("defl"), g("loose"), g("chg"), g("scr"), g("cont"), g("box")) },
  { name: "オールラウンダー", style: versat, score: versat },
];

export const TYPE_NAMES = TYPE_DEFS.map((t) => t.name);

const FILES: Record<Season, { pg: string; adv: string; hustle: string; poss: string; minGp: number; minShots: number }> = {
  rs: { pg: "player_per_game.csv", adv: "player_advanced.csv", hustle: "player_hustle.csv", poss: "player_possessions.csv", minGp: 20, minShots: 50 },
  po: { pg: "po_player_per_game.csv", adv: "po_player_advanced.csv", hustle: "po_player_hustle.csv", poss: "po_player_possessions.csv", minGp: 4, minShots: 25 },
};

function loadCsv(fname: string): Map<number, Record<string, string>> {
  const m = new Map<number, Record<string, string>>();
  for (const d of csvToObjects(readCsvFile(fname))) {
    if (d["PLAYER_NAME"]) m.set(num(d["PLAYER_ID"]), d);
  }
  return m;
}

// リング8ft未満のシュート比率（ショット座標から）
function rimShare(playerId: number, season: Season, minShots: number): number | null {
  const fp = path.join(process.cwd(), "data", "shots", `${playerId}.json`);
  if (!fs.existsSync(fp)) return null;
  try {
    const arr: [number, number, number][] = JSON.parse(fs.readFileSync(fp, "utf-8"))[season] ?? [];
    if (arr.length < minShots) return null;
    return arr.filter(([x, y]) => Math.hypot(x, y) < 80).length / arr.length;
  } catch {
    return null;
  }
}

interface TypedPlayer {
  id: number;
  name: string;
  badges: TypeBadge[]; // 評価点の高い順
}

const cache: Partial<Record<Season, Map<number, TypedPlayer>>> = {};

export function getPlayerTypes(season: Season): Map<number, TypedPlayer> {
  const hit = cache[season];
  if (hit) return hit;

  const f = FILES[season];
  const pg = loadCsv(f.pg);
  const adv = loadCsv(f.adv);
  const hustle = loadCsv(f.hustle);
  const poss = loadCsv(f.poss);

  // 全データが揃うローテーション選手のみ
  const raw = new Map<number, Record<FeatKey, number>>();
  for (const [id, p] of pg) {
    if (num(p["GP"]) < f.minGp) continue;
    const a = adv.get(id);
    const h = hustle.get(id);
    const ps = poss.get(id);
    const rim = rimShare(id, season, f.minShots);
    if (!a || !h || !ps || rim == null) continue;
    raw.set(id, {
      pts: num(p["PTS"]), reb: num(p["REB"]), ast: num(p["AST"]), stl: num(p["STL"]), blk: num(p["BLK"]),
      fg3m: num(p["FG3M"]), fg3pct: num(p["FG3_PCT"]),
      ts: num(a["TS_PCT"]), usg: num(a["USG_PCT"]), astp: num(a["AST_PCT"]), pie: num(a["PIE"]),
      share3: num(p["FG3A"]) / Math.max(num(p["FGA"]), 0.1),
      rim,
      poss: num(ps["TIME_OF_POSS"]),
      defl: num(h["DEFLECTIONS"]), cont: num(h["CONTESTED_SHOTS"]), scr: num(h["SCREEN_ASSISTS"]),
      loose: num(h["LOOSE_BALLS_RECOVERED"]), box: num(h["BOX_OUTS"]), chg: num(h["CHARGES_DRAWN"]),
    });
  }

  // 各特徴をプール内パーセンタイル化
  const ids = [...raw.keys()];
  const pcts = new Map<number, Record<FeatKey, number>>(ids.map((id) => [id, {} as Record<FeatKey, number>]));
  for (const k of FEAT_KEYS) {
    const vals = ids.map((id) => raw.get(id)![k]);
    for (const id of ids) pcts.get(id)![k] = percentileOf(vals, raw.get(id)![k]);
  }

  // スタイル点をz標準化 → z>=1.0を最大3タイプ（なければ最上位1つ）
  const styles = TYPE_DEFS.map((t) => {
    const vals = new Map(ids.map((id) => [id, t.style((k) => pcts.get(id)![k])]));
    const arr = [...vals.values()];
    const m = mean(...arr);
    const sd = Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length) || 1;
    return { def: t, z: new Map(ids.map((id) => [id, (vals.get(id)! - m) / sd])) };
  });

  const result = new Map<number, TypedPlayer>();
  for (const id of ids) {
    const g: Get = (k) => pcts.get(id)![k];
    const cand = styles
      .map((s) => ({ name: s.def.name, z: s.z.get(id)!, score: s.def.score(g) }))
      .sort((a, b) => b.z - a.z);
    const picked = cand.filter((c) => c.z >= 1.0).slice(0, 3);
    const badges = (picked.length > 0 ? picked : [cand[0]])
      .map((c) => ({ type: c.name, score: c.score }))
      .sort((a, b) => b.score - a.score);
    result.set(id, { id, name: pg.get(id)!["PLAYER_NAME"] || "", badges });
  }

  cache[season] = result;
  return result;
}

// タイプ別リーダーボード（該当者を評価点順に）
export function getTypeLeaderboard(season: Season, topN = 10): { type: string; players: { id: number; name: string; score: number }[] }[] {
  const all = getPlayerTypes(season);
  return TYPE_NAMES.map((type) => {
    const players = [...all.values()]
      .flatMap((p) => p.badges.filter((b) => b.type === type).map((b) => ({ id: p.id, name: p.name, score: b.score })))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
    return { type, players };
  });
}

// PO昇温/降温: (PO TS% − RS TS%) − 対象プール平均の変化。
// 対象は RS GP20+/PO GP8+/PO 20分+ の実質ローテ選手のみ（小標本ノイズと母集団シフトを除外）
let swingCache: Map<number, PoSwing> | null = null;

export function getPoSwing(): Map<number, PoSwing> {
  if (swingCache) return swingCache;
  const rsPg = loadCsv("player_per_game.csv");
  const rsAdv = loadCsv("player_advanced.csv");
  const poPg = loadCsv("po_player_per_game.csv");
  const poAdv = loadCsv("po_player_advanced.csv");

  const deltas = new Map<number, { d: number; gp: number }>();
  for (const [id, rp] of rsPg) {
    const pp = poPg.get(id);
    const ra = rsAdv.get(id);
    const pa = poAdv.get(id);
    if (!pp || !ra || !pa) continue;
    if (num(rp["GP"]) < 20 || num(pp["GP"]) < 8 || num(pp["MIN"]) < 20) continue;
    deltas.set(id, { d: num(pa["TS_PCT"]) - num(ra["TS_PCT"]), gp: num(pp["GP"]) });
  }
  const m = mean(...[...deltas.values()].map((v) => v.d));
  swingCache = new Map([...deltas.entries()].map(([id, v]) => [id, { delta: v.d - m, gp: v.gp }]));
  return swingCache;
}
