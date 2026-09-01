import { readCsvFile, csvToObjects, num, phaseFile, type DataCtx } from "./csv-utils";

// 共通プロローグ: CSV読み込み＋名前なし行（集計行等）の除外。phase:"po" は po_ 接頭辞ファイル
const loadRows = (fname: string, ctx: DataCtx) =>
  csvToObjects(readCsvFile(phaseFile(fname, ctx.phase), ctx.season)).filter((d) => d["PLAYER_NAME"]);

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

export function getPlayerHustle(ctx: DataCtx = {}): PlayerHustle[] {
  return loadRows("player_hustle.csv", ctx).map(mapHustle);
}

export const getPlayoffPlayerHustle = (season?: string): PlayerHustle[] => getPlayerHustle({ season, phase: "po" });

// 走行距離（シーズン合計マイル）と平均速度（mph）
export interface PlayerSpeed {
  playerId: number;
  gp: number;
  distMiles: number;
  avgSpeed: number;
}

function mapSpeed(d: Record<string, string>): PlayerSpeed {
  return {
    playerId:  num(d["PLAYER_ID"]),
    gp:        num(d["GP"]),
    distMiles: num(d["DIST_MILES"]),
    avgSpeed:  num(d["AVG_SPEED"]),
  };
}

export function getPlayerSpeed(ctx: DataCtx = {}): PlayerSpeed[] {
  return loadRows("player_speed.csv", ctx).map(mapSpeed);
}

export const getPlayoffPlayerSpeed = (season?: string): PlayerSpeed[] => getPlayerSpeed({ season, phase: "po" });

// タッチ数・ボール保持時間（per game・保持時間は分）
export interface PlayerPossessions {
  playerId: number;
  player: string;
  team: string;
  gp: number;
  touches: number;
  timeOfPoss: number;
}

function mapPossessions(d: Record<string, string>): PlayerPossessions {
  return {
    playerId:   num(d["PLAYER_ID"]),
    player:     d["PLAYER_NAME"] || "",
    team:       d["TEAM_ABBREVIATION"] || "",
    gp:         num(d["GP"]),
    touches:    num(d["TOUCHES"]),
    timeOfPoss: num(d["TIME_OF_POSS"]),
  };
}

export function getPlayerPossessions(ctx: DataCtx = {}): PlayerPossessions[] {
  return loadRows("player_possessions.csv", ctx).map(mapPossessions);
}

export const getPlayoffPlayerPossessions = (season?: string): PlayerPossessions[] => getPlayerPossessions({ season, phase: "po" });
