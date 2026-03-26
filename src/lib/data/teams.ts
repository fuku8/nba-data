import { readCsvFile, csvToObjects, num } from "./csv-utils";
import { getTeamAbbr } from "@/lib/constants/teams";
import type { TeamStanding, TeamPerGame, TeamAdvanced } from "@/lib/types";

export function getStandings(): TeamStanding[] {
  const rows = readCsvFile("standings.csv");
  const data = csvToObjects(rows);
  return data.map((d) => ({
    team: d["Team"]?.replace(/\s*\(\d+\)\s*$/, "").trim() || "",
    wins: num(d["W"]),
    losses: num(d["L"]),
    winPct: num(d["W/L%"]),
    gb: d["GB"] || "—",
    psPerGame: num(d["PS/G"]),
    paPerGame: num(d["PA/G"]),
    srs: num(d["SRS"]),
    conference: (d["Conference"] as "East" | "West") || "East",
  }));
}

export function getTeamPerGame(): TeamPerGame[] {
  const rows = readCsvFile("team_per_game.csv");
  const data = csvToObjects(rows);
  return data.map((d) => ({
    team: d["Team"]?.replace(/\s*\(\d+\)\s*$/, "").trim() || "",
    fg: num(d["FG"]),
    fga: num(d["FGA"]),
    fgPct: num(d["FG%"]),
    threePt: num(d["3P"]),
    threePtA: num(d["3PA"]),
    threePtPct: num(d["3P%"]),
    twoPt: num(d["2P"]),
    twoPtA: num(d["2PA"]),
    twoPtPct: num(d["2P%"]),
    ft: num(d["FT"]),
    fta: num(d["FTA"]),
    ftPct: num(d["FT%"]),
    orb: num(d["ORB"]),
    drb: num(d["DRB"]),
    trb: num(d["TRB"]),
    ast: num(d["AST"]),
    stl: num(d["STL"]),
    blk: num(d["BLK"]),
    tov: num(d["TOV"]),
    pf: num(d["PF"]),
    pts: num(d["PTS"]),
  }));
}

export function getTeamAdvanced(): TeamAdvanced[] {
  const rows = readCsvFile("team_advanced.csv");
  const data = csvToObjects(rows);
  return data.map((d) => ({
    team: d["Team"]?.replace(/\s*\(\d+\)\s*$/, "").trim() || "",
    wins: num(d["W"]),
    losses: num(d["L"]),
    mov: num(d["MOV"]),
    offRating: num(d["ORtg"]),
    defRating: num(d["DRtg"]),
    netRating: num(d["NRtg"]),
    pace: num(d["Pace"]),
    srs: num(d["SRS"]),
    tsPct: num(d["TS%"]),
    efgPct: num(d["eFG%"]),
  }));
}

export function getTeamAbbrFromName(teamName: string): string {
  return getTeamAbbr(teamName);
}
