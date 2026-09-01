import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { MIN_GP, PO_MIN_GP } from "@/lib/data/player-types";
import { resolvePhase } from "@/lib/phase";
import { PlayersClient } from "./client";
import type { QuadrantDot } from "@/components/quadrant-map";

export const revalidate = 3600;

const SHOOTER_MIN_3PA = 1.0;

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const { phase: phaseParam } = await searchParams;
  const poAvailable = isPlayoffDataAvailable();
  const phase = resolvePhase(phaseParam, poAvailable);
  const minGp = phase === "po" ? PO_MIN_GP : MIN_GP;
  const perGame = getPlayerPerGame({ phase }).filter((p) => p.team !== "TOT");
  const advanced = getPlayerAdvanced({ phase }).filter((p) => p.team !== "TOT");

  const usageEfficiencyDots: QuadrantDot[] = advanced
    .filter((p) => p.gp >= minGp)
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.usgPct, y: p.tsPct }));

  const shooterDots: QuadrantDot[] = perGame
    .filter((p) => p.gp >= minGp && p.threePtA >= SHOOTER_MIN_3PA)
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.threePtA, y: p.threePtPct }));

  return (
    <PlayersClient
      key={phase}
      phase={phase}
      poAvailable={poAvailable}
      perGame={perGame}
      advanced={advanced}
      usageEfficiencyDots={usageEfficiencyDots}
      shooterDots={shooterDots}
      minGp={minGp}
      shooterMin3pa={SHOOTER_MIN_3PA}
    />
  );
}
