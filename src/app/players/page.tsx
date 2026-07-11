import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { MIN_GP } from "@/lib/data/player-types";
import { PlayersClient } from "./client";
import type { QuadrantDot } from "@/components/quadrant-map";

export const revalidate = 3600;

const SHOOTER_MIN_3PA = 1.0;

export default function PlayersPage() {
  const perGame = getPlayerPerGame().filter((p) => p.team !== "TOT");
  const advanced = getPlayerAdvanced().filter((p) => p.team !== "TOT");

  const usageEfficiencyDots: QuadrantDot[] = advanced
    .filter((p) => p.gp >= MIN_GP)
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.usgPct, y: p.tsPct }));

  const shooterDots: QuadrantDot[] = perGame
    .filter((p) => p.gp >= MIN_GP && p.threePtA >= SHOOTER_MIN_3PA)
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.threePtA, y: p.threePtPct }));

  return (
    <PlayersClient
      perGame={perGame}
      advanced={advanced}
      usageEfficiencyDots={usageEfficiencyDots}
      shooterDots={shooterDots}
      minGp={MIN_GP}
      shooterMin3pa={SHOOTER_MIN_3PA}
    />
  );
}
