import { getPlayoffPlayerPerGame, getPlayoffPlayerAdvanced, getPlayoffPlayerTotals, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { getPlayoffPlayerHustle, getPlayoffPlayerSpeed } from "@/lib/data/tracking";
import { PO_MIN_GP } from "@/lib/data/player-types";
import { CompareClient, type ComparePlayer } from "./client";

export const revalidate = 3600;

const maxOf = <T,>(pool: T[], get: (x: T) => number) => Math.max(...pool.map(get), 1);

export default function PlayoffComparePage() {
  if (!isPlayoffDataAvailable()) {
    return <div className="py-20 text-center text-muted-foreground">プレーオフデータがありません</div>;
  }

  const perGame = getPlayoffPlayerPerGame().filter((p) => p.team !== "TOT" && p.gp >= PO_MIN_GP);
  const advById = new Map(
    getPlayoffPlayerAdvanced()
      .filter((p) => p.team !== "TOT" && p.gp >= PO_MIN_GP)
      .map((p) => [p.playerId, p])
  );
  const totalsById = new Map(
    getPlayoffPlayerTotals()
      .filter((p) => p.team !== "TOT" && p.gp >= PO_MIN_GP)
      .map((p) => [p.playerId, p])
  );

  // ハッスル・運動量（第2レーダー用）: 選手ページと同じPO GP下限で母集団を絞り、リーグ最大値比で正規化する
  const hustlePool = getPlayoffPlayerHustle().filter((h) => h.gp >= PO_MIN_GP);
  const speedPool = getPlayoffPlayerSpeed().filter((s) => s.gp >= PO_MIN_GP && s.distMiles > 0);
  const hustleById = new Map(hustlePool.map((h) => [h.playerId, h]));
  const speedById = new Map(speedPool.map((s) => [s.playerId, s]));
  const hustleMax = {
    screenAssists: maxOf(hustlePool, (h) => h.screenAssists),
    deflections: maxOf(hustlePool, (h) => h.deflections),
    looseBalls: maxOf(hustlePool, (h) => h.looseBalls),
    boxOuts: maxOf(hustlePool, (h) => h.boxOuts),
  };
  const distPerGame = (s: { distMiles: number; gp: number }) => s.distMiles / s.gp;
  const speedMax = {
    distPerGame: maxOf(speedPool, distPerGame),
    avgSpeed: maxOf(speedPool, (s) => s.avgSpeed),
  };

  const players: ComparePlayer[] = perGame.map((p) => {
    const adv = advById.get(p.playerId);
    const t = totalsById.get(p.playerId);
    const h = hustleById.get(p.playerId);
    const s = speedById.get(p.playerId);
    return {
      playerId: p.playerId,
      player: p.player,
      team: p.team,
      gp: p.gp,
      mpg: p.mpg,
      pts: p.pts,
      trb: p.trb,
      ast: p.ast,
      stl: p.stl,
      blk: p.blk,
      fgPct: p.fgPct,
      threePtPct: p.threePtPct,
      offRating: adv?.offRating ?? null,
      defRating: adv?.defRating ?? null,
      netRating: adv?.netRating ?? null,
      tsPct: adv?.tsPct ?? null,
      pie: adv?.pie ?? null,
      // 得点の作り方（選手ページと同じ算出: 生値からFG3M*3 + (FGM-FG3M)*2 + FTM = PTSが厳密に成立する）
      pts3: t ? (t.threePt * 3) / t.gp : p.threePt * 3,
      pts2: t ? ((t.fg - t.threePt) * 2) / t.gp : (p.fg - p.threePt) * 2,
      ptsFt: t ? t.ft / t.gp : p.ft,
      hustle2:
        h && s
          ? {
              screenAssists: h.screenAssists / hustleMax.screenAssists,
              deflections: h.deflections / hustleMax.deflections,
              looseBalls: h.looseBalls / hustleMax.looseBalls,
              boxOuts: h.boxOuts / hustleMax.boxOuts,
              distPerGame: distPerGame(s) / speedMax.distPerGame,
              avgSpeed: s.avgSpeed / speedMax.avgSpeed,
            }
          : null,
    };
  });

  return <CompareClient players={players} />;
}
