import type { PlayoffSeries } from "@/lib/types";

// プレーオフ・ブラケット（トーナメント木）の配置計算。表示は src/app/playoffs/client.tsx
//
// 1回戦の枠順は上から 1-8 / 4-5 / 3-6 / 2-7。こうすると2回戦以降の線が自然に繋がる（NBA公式・ESPNと同じ並び）。
// 枠は対戦カードの上位シード（必ず1〜4のどれか）だけで決める。standings の PLAYOFF_RANK は
// レギュラーシーズン順位で、プレーインを経た7・8シードは入れ替わりうる（2025-26 West: RS8位 POR が7シード）ため、
// 下位側のシードは配置に使わない。

export type Conference = "East" | "West";
export interface SeedInfo { conference: Conference; seed: number } // seed = RS順位（1〜）

export interface Bracket {
  // rounds[0]=1回戦4枠 / rounds[1]=2回戦2枠 / rounds[2]=カンファレンス決勝1枠。未開催は null
  west: (PlayoffSeries | null)[][];
  east: (PlayoffSeries | null)[][];
  finals: PlayoffSeries | null;
  unplaced: PlayoffSeries[]; // シード不明などで配置できなかったシリーズ（表示側でリストに落とす）
}

const R1_SLOT_BY_TOP_SEED: Record<number, number> = { 1: 0, 4: 1, 3: 2, 2: 3 };

export function buildBracket(
  series: PlayoffSeries[],
  seeds: Map<string, SeedInfo>, // チーム略称 → シード
  toAbbr: (teamName: string) => string,
): Bracket {
  const empty = () => [Array<PlayoffSeries | null>(4).fill(null), Array<PlayoffSeries | null>(2).fill(null), [null as PlayoffSeries | null]];
  const conf: Record<Conference, (PlayoffSeries | null)[][]> = { West: empty(), East: empty() };
  // 1回戦の枠 → 出場チーム。2回戦以降は「そのチームが1回戦でどの枠にいたか」で位置が決まる
  const r1SlotOf: Record<Conference, Map<string, number>> = { West: new Map(), East: new Map() };
  const unplaced: PlayoffSeries[] = [];
  let finals: PlayoffSeries | null = null;

  const place = (s: PlayoffSeries): boolean => {
    const a = toAbbr(s.team1);
    const b = toAbbr(s.team2);
    if (s.round === 4) { finals = s; return true; }
    const sa = seeds.get(a);
    const sb = seeds.get(b);
    const c = sa?.conference ?? sb?.conference;
    if (!c) return false;
    if (s.round === 1) {
      const top = Math.min(sa?.seed ?? 99, sb?.seed ?? 99);
      const slot = R1_SLOT_BY_TOP_SEED[top];
      if (slot == null || conf[c][0][slot]) return false;
      conf[c][0][slot] = s;
      r1SlotOf[c].set(a, slot);
      r1SlotOf[c].set(b, slot);
      return true;
    }
    if (s.round === 2) {
      const from = r1SlotOf[c].get(a) ?? r1SlotOf[c].get(b);
      if (from == null) return false;
      const slot = Math.floor(from / 2);
      if (conf[c][1][slot]) return false;
      conf[c][1][slot] = s;
      return true;
    }
    if (s.round === 3) {
      if (conf[c][2][0]) return false;
      conf[c][2][0] = s;
      return true;
    }
    return false;
  };

  // 1回戦→2回戦→CF→ファイナルの順に置く（2回戦の位置は1回戦の配置に依存する）
  for (const s of [...series].sort((x, y) => x.round - y.round)) {
    if (!place(s)) unplaced.push(s);
  }
  return { west: conf.West, east: conf.East, finals, unplaced };
}
