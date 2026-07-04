// 選手タイプ分類とタイプ評価点（feel-viz Phase 5）
//
// タイプ判定 = スタイル特徴（何をする選手か）のzスコアが1.0以上のタイプを最大3つ付与。
// タイプ評価点 = そのタイプの職務に対応するパーセンタイルの加重平均（0-1）。
// 「下手なスコアラー型」が正直に低得点になるよう、判定と評価は分離している。

import { readCsvFile, csvToObjects, num, dataStamp } from "./csv-utils";
import { percentileOf } from "@/components/percentile-bars";
import { versatilityScore } from "@/components/versatility-radar";
import { getPlayerShots } from "./shots";

export type Season = "rs" | "po";

export interface TypeBadge {
  type: string;
  score: number; // 0-1
  fallback: boolean; // true = +1σ以上のタイプがなく、最上位1タイプを参考表示（リーダーボード対象外）
}

export interface PoSwing {
  delta: number; // TS%変化 − リーグ（対象プール）平均変化。単位は割合（0.09 = +9pt）
}

// RS/POの母集団を回転選手に絞るGP下限。選手ページ側のパーセンタイル母集団と共通
export const MIN_GP = 20;
export const PO_MIN_GP = 4;

// 特徴キー: パーセンタイル化して使う
const FEAT_KEYS = [
  "pts", "reb", "ast", "stl", "blk", "fg3m", "fg3pct", "ts", "usg", "astp", "pie",
  "share3", "rim", "poss", "defl", "cont", "scr", "loose", "box", "chg",
] as const;
type FeatKey = (typeof FEAT_KEYS)[number];

const mean = (...xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// オールラウンダーのstyle: 5部門パーセンタイルの水準×均等さ（生値）。
// 判定(z>=1.0)は生値の分布で行い選抜率を保つ。評価点のみパーセンタイル化した g("versat") を使う
// ※FEAT_KEYSのパーセンタイルのみを参照する（KeyはDERIVEDから決まるため、循環参照を避けてFeatKeyで受ける）
const versatRaw = (g: (k: FeatKey) => number) => versatilityScore([g("pts"), g("reb"), g("ast"), g("stl"), g("blk")]);

// 派生特徴: 生値をプール内パーセンタイル化して g(key) で参照できるようにする（scoreのスケール統一用）
// ※DERIVED配下の関数はFEAT_KEYSのパーセンタイルのみを参照すること（他の派生特徴を参照しない）
const DERIVED = { versat: versatRaw } satisfies Record<string, (g: (k: FeatKey) => number) => number>;
type Key = FeatKey | keyof typeof DERIVED;
type Get = (k: Key) => number;

// style: タイプらしさ（形）/ score: そのタイプとしての職務評価
const TYPE_DEFS: { name: string; style: (g: Get) => number; score: (g: Get) => number }[] = [
  { name: "スコアラー", style: (g) => mean(g("usg"), g("pts")), score: (g) => mean(g("pts"), g("ts"), g("pie")) },
  { name: "司令塔", style: (g) => mean(g("astp"), g("poss")), score: (g) => mean(g("ast"), g("pie"), g("ts")) },
  { name: "シューター", style: (g) => mean(g("share3"), g("fg3m")), score: (g) => mean(g("fg3m"), g("fg3pct"), g("ts")) },
  { name: "3&D", style: (g) => mean(g("share3"), g("stl"), g("defl"), g("cont")), score: (g) => mean(g("fg3pct"), g("stl"), g("defl"), g("cont")) },
  { name: "ゴール下の番人", style: (g) => mean(g("rim"), g("blk"), g("box")), score: (g) => mean(g("blk"), g("reb"), g("cont"), g("box")) },
  { name: "ハッスル職人", style: (g) => mean(g("defl"), g("loose"), g("chg"), g("scr"), g("box")), score: (g) => mean(g("defl"), g("loose"), g("chg"), g("scr"), g("cont"), g("box")) },
  // style=生値（判定の選抜率を保つ）/ score=パーセンタイル（他タイプの評価点とスケールを揃える）
  { name: "オールラウンダー", style: versatRaw, score: (g) => g("versat") },
];

export const TYPE_NAMES = TYPE_DEFS.map((t) => t.name);

const FILES: Record<Season, { pg: string; adv: string; hustle: string; poss: string; minGp: number; minShots: number }> = {
  rs: { pg: "player_per_game.csv", adv: "player_advanced.csv", hustle: "player_hustle.csv", poss: "player_possessions.csv", minGp: MIN_GP, minShots: 50 },
  po: { pg: "po_player_per_game.csv", adv: "po_player_advanced.csv", hustle: "po_player_hustle.csv", poss: "po_player_possessions.csv", minGp: PO_MIN_GP, minShots: 25 },
};

function loadCsv(fname: string): Map<number, Record<string, string>> {
  const m = new Map<number, Record<string, string>>();
  for (const d of csvToObjects(readCsvFile(fname))) {
    if (d["PLAYER_NAME"]) m.set(num(d["PLAYER_ID"]), d);
  }
  return m;
}

// リング8ft未満のシュート比率（ショット座標から）
// data/shots/ は scripts/fetch-shotcharts.py で別途取得。CSVだけ更新してshotsが古いままだと、
// その選手はプールから除外され（rim==null）全員のパーセンタイルがずれる
function rimShare(playerId: number, season: Season, minShots: number): number | null {
  const arr = getPlayerShots(playerId)?.[season] ?? [];
  if (arr.length < minShots) return null;
  return arr.filter(([x, y]) => Math.hypot(x, y) < 80).length / arr.length;
}

interface TypedPlayer {
  id: number;
  name: string;
  badges: TypeBadge[]; // 評価点の高い順
}

// プロセス生存中キャッシュ。CSVのmtimeで無効化するのでローカルでCSV差し替えても再起動不要
// （data/shots/ のmtimeは対象外。差し替え後は明示的な再起動が必要）
const cache: Partial<Record<Season, { stamp: string; value: Map<number, TypedPlayer> }>> = {};

export function getPlayerTypes(season: Season): Map<number, TypedPlayer> {
  const f = FILES[season];
  const stamp = dataStamp([f.pg, f.adv, f.hustle, f.poss]);
  const hit = cache[season];
  if (hit && hit.stamp === stamp) return hit.value;

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
  const pcts = new Map<number, Record<Key, number>>(ids.map((id) => [id, {} as Record<Key, number>]));
  for (const k of FEAT_KEYS) {
    const vals = ids.map((id) => raw.get(id)![k]);
    for (const id of ids) pcts.get(id)![k] = percentileOf(vals, raw.get(id)![k]);
  }

  // 派生特徴（versatなど）もプール内パーセンタイル化してg()から引けるようにする
  // （他タイプの評価点＝パーセンタイル平均とスケールを揃えるため。生値のままだと物差しが違い構造的に低く出る）
  for (const key of Object.keys(DERIVED) as (keyof typeof DERIVED)[]) {
    const raws = ids.map((id) => DERIVED[key]((k) => pcts.get(id)![k]));
    ids.forEach((id, i) => { pcts.get(id)![key] = percentileOf(raws, raws[i]); });
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
    const isFallback = picked.length === 0;
    const badges = (isFallback ? [cand[0]] : picked)
      .map((c) => ({ type: c.name, score: c.score, fallback: isFallback }))
      .sort((a, b) => b.score - a.score);
    result.set(id, { id, name: pg.get(id)!["PLAYER_NAME"] || "", badges });
  }

  cache[season] = { stamp, value: result };
  return result;
}

// タイプ別リーダーボード（該当者を評価点順に）。fallbackバッジ（z<1.0の参考表示）は対象外
export function getTypeLeaderboard(season: Season, topN = 10): { type: string; players: { id: number; name: string; score: number }[] }[] {
  const all = getPlayerTypes(season);
  return TYPE_NAMES.map((type) => {
    const players = [...all.values()]
      .flatMap((p) => p.badges.filter((b) => b.type === type && !b.fallback).map((b) => ({ id: p.id, name: p.name, score: b.score })))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
    return { type, players };
  });
}

// PO昇温/降温: (PO TS% − RS TS%) − 対象プール平均の変化。
// 対象は RS GP20+/PO GP8+/PO 20分+ の実質ローテ選手のみ（小標本ノイズと母集団シフトを除外）
// プロセス生存中キャッシュ。CSVのmtimeで無効化するのでローカルでCSV差し替えても再起動不要
const SWING_FILES = ["player_per_game.csv", "player_advanced.csv", "po_player_per_game.csv", "po_player_advanced.csv"];
let swingCache: { stamp: string; value: Map<number, PoSwing> } | null = null;

export function getPoSwing(): Map<number, PoSwing> {
  const stamp = dataStamp(SWING_FILES);
  if (swingCache && swingCache.stamp === stamp) return swingCache.value;
  const rsPg = loadCsv("player_per_game.csv");
  const rsAdv = loadCsv("player_advanced.csv");
  const poPg = loadCsv("po_player_per_game.csv");
  const poAdv = loadCsv("po_player_advanced.csv");

  const deltas = new Map<number, number>();
  for (const [id, rp] of rsPg) {
    const pp = poPg.get(id);
    const ra = rsAdv.get(id);
    const pa = poAdv.get(id);
    if (!pp || !ra || !pa) continue;
    if (num(rp["GP"]) < MIN_GP || num(pp["GP"]) < 8 || num(pp["MIN"]) < 20) continue;
    deltas.set(id, num(pa["TS_PCT"]) - num(ra["TS_PCT"]));
  }
  const m = mean(...[...deltas.values()]);
  const value = new Map([...deltas.entries()].map(([id, d]) => [id, { delta: d - m }]));
  swingCache = { stamp, value };
  return value;
}
