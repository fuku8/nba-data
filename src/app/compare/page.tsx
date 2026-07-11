import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals } from "@/lib/data/players";
import { getPlayerHustle, getPlayerSpeed } from "@/lib/data/tracking";
import { MIN_GP } from "@/lib/data/player-types";
import { CompareClient, type ComparePlayer } from "./client";

export const revalidate = 3600;

const maxOf = <T,>(pool: T[], get: (x: T) => number) => Math.max(...pool.map(get), 1);

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const perGame = getPlayerPerGame().filter((p) => p.team !== "TOT" && p.gp >= 10);
  const advById = new Map(
    getPlayerAdvanced()
      .filter((p) => p.team !== "TOT" && p.gp >= 10)
      .map((p) => [p.playerId, p])
  );
  const totalsById = new Map(
    getPlayerTotals()
      .filter((p) => p.team !== "TOT" && p.gp >= 10)
      .map((p) => [p.playerId, p])
  );

  // ハッスル・運動量（第2レーダー用）: 選手ページと同じGP下限で母集団を絞り、リーグ最大値比で正規化する
  const hustlePool = getPlayerHustle().filter((h) => h.gp >= MIN_GP);
  const speedPool = getPlayerSpeed().filter((s) => s.gp >= MIN_GP && s.distMiles > 0);
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
      // 得点の作り方（選手ページと同じ算出: 生値からFG3M*3 + (FGM-FG3M)*2 + FTM = PTSが厳密に成立）
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

  const { ids } = await searchParams;
  const initialIds = ids
    ?.split(",")
    .map((s) => parseInt(s, 10))
    .filter((id, i, arr) => !isNaN(id) && arr.indexOf(id) === i && players.some((p) => p.playerId === id))
    .slice(0, 4); // MAX_PLAYERS（client.tsx）と同じ上限

  return <CompareClient players={players} initialIds={initialIds} />;
}
