import { readCsvFile, csvToObjects, num } from "./csv-utils";

// ハッスル統計（per game）。G はトラッキング計測試合数で player_per_game の GP と一致しないことがある
export interface PlayerHustle {
  playerId: number;
  player: string;
  team: string;
  gp: number;
  mpg: number;
  contestedShots: number;
  deflections: number;
  chargesDrawn: number;
  screenAssists: number;
  looseBalls: number;
  boxOuts: number;
}

function mapHustle(d: Record<string, string>): PlayerHustle {
  return {
    playerId:       num(d["PLAYER_ID"]),
    player:         d["PLAYER_NAME"] || "",
    team:           d["TEAM_ABBREVIATION"] || "",
    gp:             num(d["G"]),
    mpg:            num(d["MIN"]),
    contestedShots: num(d["CONTESTED_SHOTS"]),
    deflections:    num(d["DEFLECTIONS"]),
    chargesDrawn:   num(d["CHARGES_DRAWN"]),
    screenAssists:  num(d["SCREEN_ASSISTS"]),
    looseBalls:     num(d["LOOSE_BALLS_RECOVERED"]),
    boxOuts:        num(d["BOX_OUTS"]),
  };
}

export function getPlayerHustle(): PlayerHustle[] {
  return csvToObjects(readCsvFile("player_hustle.csv")).filter((d) => d["PLAYER_NAME"]).map(mapHustle);
}

export function getPlayoffPlayerHustle(): PlayerHustle[] {
  return csvToObjects(readCsvFile("po_player_hustle.csv")).filter((d) => d["PLAYER_NAME"]).map(mapHustle);
}

// 走行距離（シーズン合計マイル）と平均速度（mph）
export interface PlayerSpeed {
  playerId: number;
  gp: number;
  distMiles: number;
  avgSpeed: number;
}

export function getPlayerSpeed(): PlayerSpeed[] {
  return csvToObjects(readCsvFile("player_speed.csv"))
    .filter((d) => d["PLAYER_NAME"])
    .map((d) => ({
      playerId:  num(d["PLAYER_ID"]),
      gp:        num(d["GP"]),
      distMiles: num(d["DIST_MILES"]),
      avgSpeed:  num(d["AVG_SPEED"]),
    }));
}

// タッチ数・ボール保持時間（per game・保持時間は分）
export interface PlayerPossessions {
  playerId: number;
  player: string;
  team: string;
  gp: number;
  touches: number;
  timeOfPoss: number;
}

export function getPlayerPossessions(): PlayerPossessions[] {
  return csvToObjects(readCsvFile("player_possessions.csv"))
    .filter((d) => d["PLAYER_NAME"])
    .map((d) => ({
      playerId:   num(d["PLAYER_ID"]),
      player:     d["PLAYER_NAME"] || "",
      team:       d["TEAM_ABBREVIATION"] || "",
      gp:         num(d["GP"]),
      touches:    num(d["TOUCHES"]),
      timeOfPoss: num(d["TIME_OF_POSS"]),
    }));
}
