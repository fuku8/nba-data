import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { SearchClient } from "./client";

export const revalidate = 3600;

export default function SearchPage() {
  const perGame = getPlayerPerGame().filter((p) => p.team !== "TOT");
  const advanced = getPlayerAdvanced().filter((p) => p.team !== "TOT");
  return <SearchClient perGame={perGame} advanced={advanced} />;
}
