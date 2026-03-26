import type { Game } from "@/lib/types";

const API_BASE = "https://api.balldontlie.io/v1";

async function fetchApi(endpoint: string): Promise<unknown> {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = apiKey;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`BallDontLie API error: ${res.status}`);
  }

  return res.json();
}

export async function getGamesByDate(date: string): Promise<Game[]> {
  try {
    const data = (await fetchApi(
      `/games?dates[]=${date}`
    )) as { data: Game[] };
    return data.data || [];
  } catch (e) {
    console.error("Failed to fetch games:", e);
    return [];
  }
}

export async function getRecentGames(days: number = 3): Promise<Game[]> {
  const games: Game[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayGames = await getGamesByDate(dateStr);
    games.push(...dayGames);
  }

  return games.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
