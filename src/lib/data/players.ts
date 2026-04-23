import { readCsvFile, csvToObjects, num } from "./csv-utils";
import type { PlayerPerGame, PlayerAdvanced, PlayerTotals, PlayerProfile } from "@/lib/types";

function mapPlayerPerGame(d: Record<string, string>): PlayerPerGame {
  return {
    playerId:    num(d["PLAYER_ID"]),
    player:      d["PLAYER_NAME"] || "",
    teamId:      num(d["TEAM_ID"]),
    team:        d["TEAM_ABBREVIATION"] || "",
    age:         num(d["AGE"]),
    gp:          num(d["GP"]),
    wins:        num(d["W"]),
    losses:      num(d["L"]),
    winPct:      num(d["W_PCT"]),
    mpg:         num(d["MIN"]),
    fg:          num(d["FGM"]),
    fga:         num(d["FGA"]),
    fgPct:       num(d["FG_PCT"]),
    threePt:     num(d["FG3M"]),
    threePtA:    num(d["FG3A"]),
    threePtPct:  num(d["FG3_PCT"]),
    ft:          num(d["FTM"]),
    fta:         num(d["FTA"]),
    ftPct:       num(d["FT_PCT"]),
    orb:         num(d["OREB"]),
    drb:         num(d["DREB"]),
    trb:         num(d["REB"]),
    ast:         num(d["AST"]),
    stl:         num(d["STL"]),
    blk:         num(d["BLK"]),
    blka:        num(d["BLKA"]),
    tov:         num(d["TOV"]),
    pf:          num(d["PF"]),
    pfd:         num(d["PFD"]),
    pts:         num(d["PTS"]),
    plusMinus:   num(d["PLUS_MINUS"]),
    dd2:         num(d["DD2"]),
    td3:         num(d["TD3"]),
  };
}

function mapPlayerTotals(d: Record<string, string>): PlayerTotals {
  return {
    playerId:  num(d["PLAYER_ID"]),
    player:    d["PLAYER_NAME"] || "",
    teamId:    num(d["TEAM_ID"]),
    team:      d["TEAM_ABBREVIATION"] || "",
    age:       num(d["AGE"]),
    gp:        num(d["GP"]),
    mp:        num(d["MIN"]),
    fg:        num(d["FGM"]),
    fga:       num(d["FGA"]),
    threePt:   num(d["FG3M"]),
    threePtA:  num(d["FG3A"]),
    ft:        num(d["FTM"]),
    fta:       num(d["FTA"]),
    orb:       num(d["OREB"]),
    drb:       num(d["DREB"]),
    trb:       num(d["REB"]),
    ast:       num(d["AST"]),
    stl:       num(d["STL"]),
    blk:       num(d["BLK"]),
    tov:       num(d["TOV"]),
    pf:        num(d["PF"]),
    pts:       num(d["PTS"]),
    plusMinus: num(d["PLUS_MINUS"]),
  };
}

export function getPlayerPerGame(): PlayerPerGame[] {
  const rows = readCsvFile("player_per_game.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerPerGame);
}

function mapPlayerAdvanced(d: Record<string, string>): PlayerAdvanced {
  return {
    playerId:  num(d["PLAYER_ID"]),
    player:    d["PLAYER_NAME"] || "",
    teamId:    num(d["TEAM_ID"]),
    team:      d["TEAM_ABBREVIATION"] || "",
    age:       num(d["AGE"]),
    gp:        num(d["GP"]),
    mp:        num(d["MIN"]),
    offRating: num(d["OFF_RATING"]),
    defRating: num(d["DEF_RATING"]),
    netRating: num(d["NET_RATING"]),
    astPct:    num(d["AST_PCT"]),
    astTo:     num(d["AST_TO"]),
    astRatio:  num(d["AST_RATIO"]),
    orebPct:   num(d["OREB_PCT"]),
    drebPct:   num(d["DREB_PCT"]),
    rebPct:    num(d["REB_PCT"]),
    tmTovPct:  num(d["TM_TOV_PCT"]),
    efgPct:    num(d["EFG_PCT"]),
    tsPct:     num(d["TS_PCT"]),
    usgPct:    num(d["USG_PCT"]),
    pace:      num(d["PACE"]),
    pie:       num(d["PIE"]),
    poss:      num(d["POSS"]),
  };
}

export function getPlayerAdvanced(): PlayerAdvanced[] {
  const rows = readCsvFile("player_advanced.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerAdvanced);
}

export function getPlayerTotals(): PlayerTotals[] {
  const rows = readCsvFile("player_totals.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerTotals);
}

export function searchPlayers(
  query: string,
  players: PlayerPerGame[]
): PlayerPerGame[] {
  const q = query.toLowerCase();
  return players.filter((p) => p.player.toLowerCase().includes(q));
}

// playoffs.ts でプレーオフ統計の変換に再利用するため export
export { mapPlayerPerGame, mapPlayerTotals, mapPlayerAdvanced };

// ===== 選手プロフィール =====

function mapPlayerProfile(d: Record<string, string>): PlayerProfile {
  const birthdateRaw = d["BIRTHDATE"] || "";
  const birthdate = birthdateRaw.includes("T")
    ? birthdateRaw.split("T")[0]
    : birthdateRaw;
  return {
    playerId:    num(d["PERSON_ID"]),
    playerName:  d["DISPLAY_FIRST_LAST"] || "",
    birthdate,
    height:      d["HEIGHT"] || "",
    weight:      d["WEIGHT"] || "",
    position:    d["POSITION"] || "",
    jersey:      d["JERSEY"] || "",
    country:     d["COUNTRY"] || "",
    school:      d["SCHOOL"] || "",
    fromYear:    num(d["FROM_YEAR"]),
    draftYear:   d["DRAFT_YEAR"] || "",
    draftRound:  d["DRAFT_ROUND"] || "",
    draftNumber: d["DRAFT_NUMBER"] || "",
  };
}

export function getAllPlayerProfiles(): PlayerProfile[] {
  const rows = readCsvFile("player_profiles.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["DISPLAY_FIRST_LAST"])
    .map(mapPlayerProfile);
}

export function getPlayerProfile(playerId: number): PlayerProfile | undefined {
  return getAllPlayerProfiles().find((p) => p.playerId === playerId);
}
