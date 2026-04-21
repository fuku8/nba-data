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
  const players = getPlayoffPlayerPerGame();
  const teamMap = new Map<string, { pts: number[]; trb: number[]; ast: number[]; stl: number[]; blk: number[]; tov: number[]; fgPct: number[]; threePtPct: number[]; ftPct: number[] }>();

  for (const p of players) {
    if (!p.team || p.team === "TOT") continue;
    if (!teamMap.has(p.team)) {
      teamMap.set(p.team, { pts: [], trb: [], ast: [], stl: [], blk: [], tov: [], fgPct: [], threePtPct: [], ftPct: [] });
    }
    const t = teamMap.get(p.team)!;
    t.pts.push(p.pts); t.trb.push(p.trb); t.ast.push(p.ast);
    t.stl.push(p.stl); t.blk.push(p.blk); t.tov.push(p.tov);
    t.fgPct.push(p.fgPct); t.threePtPct.push(p.threePtPct); t.ftPct.push(p.ftPct);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return Array.from(teamMap.entries()).map(([team, s]) => ({
    team,
    pts: avg(s.pts), trb: avg(s.trb), ast: avg(s.ast),
    stl: avg(s.stl), blk: avg(s.blk), tov: avg(s.tov),
    fgPct: avg(s.fgPct), threePtPct: avg(s.threePtPct), ftPct: avg(s.ftPct),
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
