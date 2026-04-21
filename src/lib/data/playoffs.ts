import { readCsvFile, csvToObjects, num } from "./csv-utils";
import type {
  PlayoffSeries,
  PlayoffTeamStats,
  PlayoffPlayerPerGame,
  PlayoffPlayerTotals,
} from "@/lib/types";

export function isPlayoffDataAvailable(): boolean {
  const rows = readCsvFile("po_player_per_game.csv");
  return rows.length > 1;
}

export function getPlayoffSeries(): PlayoffSeries[] {
  const rows = readCsvFile("po_series.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["team1"] && d["team2"])
    .map((d) => ({
      team1: d["team1"] || "",
      team2: d["team2"] || "",
      team1Wins: num(d["team1_wins"]),
      team2Wins: num(d["team2_wins"]),
      winner: d["winner"] || "",
      seriesStatus: d["series_status"] || "",
      round: num(d["round"]),
      roundName: d["round_name"] || "",
      firstGameDate: d["first_game_date"] || "",
      lastGameDate: d["last_game_date"] || "",
    }));
}

export function getPlayoffTeamStats(): PlayoffTeamStats[] {
  const rows = readCsvFile("po_team_stats.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["Team"])
    .map((d) => ({
      team: d["Team"] || "",
      pts: num(d["PTS"]),
      trb: num(d["TRB"]),
      ast: num(d["AST"]),
      stl: num(d["STL"]),
      blk: num(d["BLK"]),
      tov: num(d["TOV"]),
      fgPct: num(d["FG%"]),
      threePtPct: num(d["3P%"]),
      ftPct: num(d["FT%"]),
    }));
}

export function getPlayoffPlayerPerGame(): PlayoffPlayerPerGame[] {
  const rows = readCsvFile("po_player_per_game.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["Player"] && d["Player"] !== "Player")
    .map((d) => ({
      player: d["Player"] || "",
      age: num(d["Age"]),
      team: d["Tm"] || d["Team"] || "",
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

export function getPlayoffPlayerTotals(): PlayoffPlayerTotals[] {
  const rows = readCsvFile("po_player_totals.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["Player"] && d["Player"] !== "Player")
    .map((d) => ({
      player: d["Player"] || "",
      age: num(d["Age"]),
      team: d["Tm"] || d["Team"] || "",
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
