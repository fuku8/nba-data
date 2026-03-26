import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { LeadersClient } from "./client";

export const revalidate = 3600;

export default function LeadersPage() {
  const perGame = getPlayerPerGame().filter((p) => p.gp >= 30 && p.team !== "TOT");
  const advanced = getPlayerAdvanced().filter((p) => p.gp >= 30 && p.team !== "TOT");
  return <LeadersClient perGame={perGame} advanced={advanced} />;
}
