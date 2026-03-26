import { readCsvFile, csvToObjects, num } from "./csv-utils";
import type { PlayerPerGame, PlayerAdvanced, PlayerTotals } from "@/lib/types";

export function getPlayerPerGame(): PlayerPerGame[] {
  const rows = readCsvFile("player_per_game.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["Player"] && d["Player"] !== "Player")
    .map((d) => ({
      player: d["Player"] || "",
      age: num(d["Age"]),
      team: d["Tm"] || "",
      pos: d["Pos"] || "",
      gp: num(d["G"]),
      gs: num(d["GS"]),
      mpg: num(d["MP"]),
      fg: num(d["FG"]),
      fga: num(d["FGA"]),
      fgPct: num(d["FG%"]),
      threePt: num(d["3P"]),
      threePtA: num(d["3PA"]),
      threePtPct: num(d["3P%"]),
      twoPt: num(d["2P"]),
      twoPtA: num(d["2PA"]),
      twoPtPct: num(d["2P%"]),
      efgPct: num(d["eFG%"]),
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

export function getPlayerAdvanced(): PlayerAdvanced[] {
  const rows = readCsvFile("player_advanced.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["Player"] && d["Player"] !== "Player")
    .map((d) => ({
      player: d["Player"] || "",
      age: num(d["Age"]),
      team: d["Tm"] || "",
      pos: d["Pos"] || "",
      gp: num(d["G"]),
      mp: num(d["MP"]),
      per: num(d["PER"]),
      tsPct: num(d["TS%"]),
      efgPct: num(d["eFG%"]),
      usgPct: num(d["USG%"]),
      ows: num(d["OWS"]),
      dws: num(d["DWS"]),
      ws: num(d["WS"]),
      wsPer48: num(d["WS/48"]),
      obpm: num(d["OBPM"]),
      dbpm: num(d["DBPM"]),
      bpm: num(d["BPM"]),
      vorp: num(d["VORP"]),
      orbPct: num(d["ORB%"]),
      drbPct: num(d["DRB%"]),
      trbPct: num(d["TRB%"]),
      astPct: num(d["AST%"]),
      stlPct: num(d["STL%"]),
      blkPct: num(d["BLK%"]),
      tovPct: num(d["TOV%"]),
    }));
}

export function getPlayerTotals(): PlayerTotals[] {
  const rows = readCsvFile("player_totals.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["Player"] && d["Player"] !== "Player")
    .map((d) => ({
      player: d["Player"] || "",
      age: num(d["Age"]),
      team: d["Tm"] || "",
      pos: d["Pos"] || "",
      gp: num(d["G"]),
      gs: num(d["GS"]),
      mp: num(d["MP"]),
      fg: num(d["FG"]),
      fga: num(d["FGA"]),
      threePt: num(d["3P"]),
      threePtA: num(d["3PA"]),
      twoPt: num(d["2P"]),
      twoPtA: num(d["2PA"]),
      ft: num(d["FT"]),
      fta: num(d["FTA"]),
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

export function searchPlayers(
  query: string,
  players: PlayerPerGame[]
): PlayerPerGame[] {
  const q = query.toLowerCase();
  return players.filter((p) => p.player.toLowerCase().includes(q));
}
