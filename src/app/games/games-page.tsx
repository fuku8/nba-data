import fs from "fs";
import path from "path";
import { getGames, getGameDates, getDramaScores } from "@/lib/data/games";
import { currentSeason, seasonDir } from "@/lib/season";
import { getPlayoffSeries, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import type { Phase } from "@/lib/phase";
import { PreSeasonNotice } from "@/components/phase-switch";
import { GamesClient } from "./client";

// フェーズはパス区分（/games = RS, /games/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderGames(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const ctx = { phase };
  const games = getGames(ctx);
  const dates = getGameDates(ctx);
  const drama = phase === "po" ? Object.fromEntries(getDramaScores()) : {};
  const series = phase === "po" ? getPlayoffSeries() : [];
  // ボックススコアがある試合だけ詳細リンクを出す（取得失敗で po_games.csv にだけある試合は /games/[gameId] が生成されない）
  const boxDir = path.join(seasonDir(currentSeason()), "boxscores");
  const withBox = phase === "po" && fs.existsSync(boxDir) ? fs.readdirSync(boxDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : [];
  return <GamesClient key={phase} games={games} dates={dates} phase={phase} poAvailable={poAvailable} drama={drama} series={series} withBox={withBox} />;
}
