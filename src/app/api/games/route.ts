import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ games: [] });
  }

  const apiKey = process.env.BALLDONTLIE_API_KEY;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    headers["Authorization"] = apiKey;
  }

  try {
    const res = await fetch(
      `https://api.balldontlie.io/v1/games?dates[]=${date}`,
      { headers, next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ games: [], error: `API returned ${res.status}` });
    }

    const data = await res.json();
    return NextResponse.json({ games: data.data || [] });
  } catch (e) {
    return NextResponse.json({ games: [], error: "Failed to fetch games" });
  }
}
