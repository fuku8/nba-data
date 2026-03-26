import { getGames, getGameDates } from "@/lib/data/games";
import { GamesClient } from "./client";

export const revalidate = 3600;

export default function GamesPage() {
  const games = getGames();
  const dates = getGameDates();
  return <GamesClient games={games} dates={dates} />;
}
