import { readCsvFile, csvToObjects, num, phaseFile, type DataCtx } from "./csv-utils";
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

export function getPlayerPerGame(ctx: DataCtx = {}): PlayerPerGame[] {
  const rows = readCsvFile(phaseFile("player_per_game.csv", ctx.phase), ctx.season);
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

export function getPlayerAdvanced(ctx: DataCtx = {}): PlayerAdvanced[] {
  const rows = readCsvFile(phaseFile("player_advanced.csv", ctx.phase), ctx.season);
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerAdvanced);
}

export function getPlayerTotals(ctx: DataCtx = {}): PlayerTotals[] {
  const rows = readCsvFile(phaseFile("player_totals.csv", ctx.phase), ctx.season);
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

// ===== 選手プロフィール =====

function mapPlayerProfile(d: Record<string, string>): PlayerProfile {
  const birthdateRaw = d["BIRTHDATE"] || "";
  const birthdate = birthdateRaw.includes("T")
    ? birthdateRaw.split("T")[0]
    : birthdateRaw;
  return {
    playerId:    num(d["PLAYER_ID"]),
    playerName:  d["PLAYER_NAME"] || "",
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

export function getAllPlayerProfiles(season?: string): PlayerProfile[] {
  const rows = readCsvFile("player_profiles.csv", season);
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerProfile);
}

export function getPlayerProfile(playerId: number, season?: string): PlayerProfile | undefined {
  return getAllPlayerProfiles(season).find((p) => p.playerId === playerId);
}

// 現在の所属チーム（名簿。data/player_teams.csv・現季のみ）。成績行のチームは「最後に出場したチーム」なので、
// 移籍して未出場の選手は名簿でしか新しい所属が分からない。ファイルが無い間は空（呼び出し側は成績行に戻る）
export function getRoster(): { playerId: number; player: string; team: string }[] {
  return csvToObjects(readCsvFile("player_teams.csv"))
    .filter((d) => d["TEAM_ABBREVIATION"])
    .map((d) => ({ playerId: num(d["PLAYER_ID"]), player: d["PLAYER_NAME"] || "", team: d["TEAM_ABBREVIATION"] }));
}

// 現在の所属チーム＝名簿のチーム。名簿に居ない選手は、今季の出場があっても「所属なし」（null）。
// ロスター表は NBA の名簿そのまま、という1つの決まりにする（2026-10-01 ふくたろう決定。出場後に解雇された選手を
// 最後のチームに残す案は不採用）。選手ページの見出しとチームページのロスターが同じこの関数を使う。
// 名簿が空（ファイルが無い）のときだけ fallback（成績行のチーム）を返す
export function currentTeam(roster: Map<number, string>, playerId: number, fallback: string | null): string | null {
  return roster.size === 0 ? fallback : roster.get(playerId) ?? null;
}
export const rosterTeamMap = () => new Map(getRoster().map((r) => [r.playerId, r.team]));
