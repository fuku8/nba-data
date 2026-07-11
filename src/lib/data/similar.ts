// 似たタイプの選手
//
// 母集団: サイト内の相対評価（パーセンタイル・タイプ判定）と同じ基準（team!=="TOT" && gp>=MIN_GP）。
// 試合数が少なすぎる選手はper-gameスタッツのノイズが大きく、数値の偶然一致で類似に出てしまうため除外する。
// 特徴量をこの母集団のz-scoreに標準化し、ユークリッド距離が最小の選手を返す。

import { getPlayerPerGame, getPlayerAdvanced } from "./players";
import { MIN_GP } from "./player-types";
import type { PlayerPerGame, PlayerAdvanced } from "@/lib/types";

type FeatureGetter = (pg: PlayerPerGame, adv: PlayerAdvanced | undefined) => number | null;

const FEATURES: FeatureGetter[] = [
  (pg) => pg.mpg,
  (pg) => pg.pts,
  (pg) => pg.trb,
  (pg) => pg.ast,
  (pg) => pg.stl,
  (pg) => pg.blk,
  (pg) => pg.tov,
  (pg) => pg.fgPct,
  (pg) => pg.threePtPct,
  (pg) => pg.threePtA,
  (pg) => pg.ftPct,
  (_pg, adv) => adv?.usgPct ?? null,
  (_pg, adv) => adv?.tsPct ?? null,
  (_pg, adv) => adv?.astPct ?? null,
  (_pg, adv) => adv?.rebPct ?? null,
];

function pickRow<T extends { playerId: number; team: string }>(all: T[], playerId: number): T | undefined {
  return all.find((p) => p.playerId === playerId && p.team !== "TOT") ?? all.find((p) => p.playerId === playerId);
}

function meanStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

// 欠損（null）は母集団平均として扱う = z-score 0
function zVector(pg: PlayerPerGame, adv: PlayerAdvanced | undefined, stats: { mean: number; std: number }[]): number[] {
  return FEATURES.map((get, i) => {
    const v = get(pg, adv);
    if (v == null) return 0;
    const { mean, std } = stats[i];
    return std === 0 ? 0 : (v - mean) / std;
  });
}

// 指定選手にスタッツが最も近い選手のplayerIdを距離の近い順にcount件返す。計算不能ならnull
export function getSimilarPlayers(playerId: number, count = 3): number[] | null {
  const allPerGame = getPlayerPerGame();
  const allAdvanced = getPlayerAdvanced();
  const population = allPerGame.filter((p) => p.team !== "TOT" && p.gp >= MIN_GP);
  if (population.length === 0) return null;

  const targetPg = pickRow(allPerGame, playerId);
  if (!targetPg) return null;
  const targetAdv = pickRow(allAdvanced, playerId);

  const advById = new Map(
    allAdvanced.filter((p) => p.team !== "TOT" && p.gp >= MIN_GP).map((p) => [p.playerId, p])
  );

  const stats = FEATURES.map((get) =>
    meanStd(
      population
        .map((p) => get(p, advById.get(p.playerId)))
        .filter((v): v is number => v != null)
    )
  );

  const targetZ = zVector(targetPg, targetAdv, stats);

  const ranked = population
    .filter((p) => p.playerId !== playerId)
    .map((p) => {
      const z = zVector(p, advById.get(p.playerId), stats);
      const dist = Math.sqrt(z.reduce((sum, v, i) => sum + (v - targetZ[i]) ** 2, 0));
      return { playerId: p.playerId, dist };
    })
    .sort((a, b) => a.dist - b.dist);

  // 移籍選手はチームごとに複数行あるため、playerId単位で重複を除いて近い順にcount名
  const result: number[] = [];
  for (const c of ranked) {
    if (!result.includes(c.playerId)) result.push(c.playerId);
    if (result.length >= count) break;
  }

  return result.length > 0 ? result : null;
}
