import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { PlayersClient } from "./client";

export const revalidate = 3600;

export default function PlayersPage() {
  const perGame = getPlayerPerGame().filter((p) => p.team !== "TOT");
  const advanced = getPlayerAdvanced().filter((p) => p.team !== "TOT");
  return <PlayersClient perGame={perGame} advanced={advanced} />;
}
