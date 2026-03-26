import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { CompareClient } from "./client";

export const revalidate = 3600;

export default function ComparePage() {
  const perGame = getPlayerPerGame().filter((p) => p.team !== "TOT" && p.gp >= 10);
  const advanced = getPlayerAdvanced().filter((p) => p.team !== "TOT" && p.gp >= 10);
  return <CompareClient perGame={perGame} advanced={advanced} />;
}
