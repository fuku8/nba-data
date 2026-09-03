import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals } from "@/lib/data/players";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { getPlayerHustle, getPlayerSpeed } from "@/lib/data/tracking";
import { MIN_GP, PO_MIN_GP } from "@/lib/data/player-types";
import { playerNameJa } from "@/lib/data/names-ja";
import type { Phase } from "@/lib/phase";
import { currentSeason } from "@/lib/season";
import { PreSeasonNotice } from "@/components/phase-switch";
import { Suspense } from "react";
import { CompareClient, type ComparePlayer } from "./client";

const maxOf = <T,>(pool: T[], get: (x: T) => number) => Math.max(...pool.map(get), 1);

// フェーズはパス区分（/compare = RS, /compare/po = PO）。?ids= はクライアント側だけが読む（静的HTMLは同一）
export function renderCompare(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const ctx = { phase };
  // 検索対象のGP下限（RS10・PO4）。レーダー母集団はサイト共通のローテ選手下限（RS20・PO4）
  const listMinGp = phase === "po" ? PO_MIN_GP : 10;
  const poolMinGp = phase === "po" ? PO_MIN_GP : MIN_GP;
  const perGame = getPlayerPerGame(ctx).filter((p) => p.team !== "TOT" && p.gp >= listMinGp);
  const advById = new Map(
    getPlayerAdvanced(ctx)
      .filter((p) => p.team !== "TOT" && p.gp >= listMinGp)
      .map((p) => [p.playerId, p])
  );
  const totalsById = new Map(
    getPlayerTotals(ctx)
      .filter((p) => p.team !== "TOT" && p.gp >= listMinGp)
      .map((p) => [p.playerId, p])
  );

  // ハッスル・運動量（第2レーダー用）: 選手ページと同じGP下限で母集団を絞り、リーグ最大値比で正規化する
  const hustlePool = getPlayerHustle(ctx).filter((h) => h.gp >= poolMinGp);
  const speedPool = getPlayerSpeed(ctx).filter((s) => s.gp >= poolMinGp && s.distMiles > 0);
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
      // 検索照合用（カタカナで当てる。plan §13-1 段階1。表示は英語名のまま）
      playerJa: playerNameJa(p.playerId) ?? null,
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

  // useSearchParams を使うクライアントは Suspense で包む（静的エクスポートの要件）
  return (
    <Suspense fallback={null}>
      <CompareClient key={phase} players={players} phase={phase} season={currentSeason()} poAvailable={poAvailable} />
    </Suspense>
  );
}
