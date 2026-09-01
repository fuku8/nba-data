import fs from "fs";
import path from "path";
import { currentSeason, seasonDir } from "../season.ts";

// [LOC_X, LOC_Y, SHOT_MADE_FLAG] — 原点=リング中心、1単位=0.1フィート
export type Shot = [number, number, number];

export interface PlayerShots {
  rs: Shot[];
  po: Shot[];
}

export function getPlayerShots(playerId: number, season?: string): PlayerShots | null {
  const filepath = path.join(seasonDir(season ?? currentSeason()), "shots", `${playerId}.json`);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return null;
  }
}
