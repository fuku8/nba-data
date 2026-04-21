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
  // po_team_stats.csv が存在すればBRの公式per game値を優先使用
  const csvRows = readCsvFile("po_team_stats.csv");
  if (csvRows.length > 1) {
    const data = csvToObjects(csvRows);
    return data
      .filter((d) => d["Team"] && num(d["G"]) > 0)
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

  // フォールバック: po_player_totals.csv から集計
  const players = getPlayoffPlayerTotals();

  type TeamAccum = {
    fg: number; fga: number;
    threePt: number; threePtA: number;
    ft: number; fta: number;
    pts: number; trb: number; ast: number; stl: number; blk: number; tov: number;
    maxGp: number;
  };

  const teamMap = new Map<string, TeamAccum>();

  for (const p of players) {
    if (!p.team || p.team === "TOT") continue;
    if (!teamMap.has(p.team)) {
      teamMap.set(p.team, { fg: 0, fga: 0, threePt: 0, threePtA: 0, ft: 0, fta: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, tov: 0, maxGp: 0 });
    }
    const t = teamMap.get(p.team)!;
    t.fg += p.fg; t.fga += p.fga;
    t.threePt += p.threePt; t.threePtA += p.threePtA;
    t.ft += p.ft; t.fta += p.fta;
    t.pts += p.pts; t.trb += p.trb; t.ast += p.ast;
    t.stl += p.stl; t.blk += p.blk; t.tov += p.tov;
    t.maxGp = Math.max(t.maxGp, p.gp);
  }

  return Array.from(teamMap.entries()).map(([team, s]) => {
    const gp = s.maxGp || 1;
    return {
      team,
      pts: s.pts / gp,
      trb: s.trb / gp,
      ast: s.ast / gp,
      stl: s.stl / gp,
      blk: s.blk / gp,
      tov: s.tov / gp,
      fgPct: s.fga > 0 ? s.fg / s.fga : 0,
      threePtPct: s.threePtA > 0 ? s.threePt / s.threePtA : 0,
      ftPct: s.fta > 0 ? s.ft / s.fta : 0,
    };
  });
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
