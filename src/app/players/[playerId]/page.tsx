import { renderPlayer, playerIdsOf } from "./player-page";
import { currentSeason } from "@/lib/season";

export const dynamicParams = false;

export function generateStaticParams() {
  return playerIdsOf(currentSeason()).map((id) => ({ playerId: String(id) }));
}

export default async function Page({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  return renderPlayer(playerId, currentSeason());
}
