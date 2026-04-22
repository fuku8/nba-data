import { readCsvFile, csvToObjects, num } from "./csv-utils";
import { mapPlayerPerGame, mapPlayerTotals, mapPlayerAdvanced } from "./players";
import type {
  PlayoffSeries,
  PlayoffTeamStats,
  PlayoffPlayerPerGame,
  PlayoffPlayerTotals,
  PlayoffPlayerAdvanced,
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
      team1:         d["team1"] || "",
      team2:         d["team2"] || "",
      team1Wins:     num(d["team1_wins"]),
      team2Wins:     num(d["team2_wins"]),
      winner:        d["winner"] || "",
      seriesStatus:  d["series_status"] || "",
      round:         num(d["round"]),
      roundName:     d["round_name"] || "",
      firstGameDate: d["first_game_date"] || "",
      lastGameDate:  d["last_game_date"] || "",
    }));
}

export function getPlayoffTeamStats(): PlayoffTeamStats[] {
  // po_team_per_game.csv は現在未生成のため、po_player_totals.csv から集計
  const players = getPlayoffPlayerTotals();
  type Acc = { fg: number; fga: number; fg3: number; fg3a: number; ft: number; fta: number; pts: number; trb: number; ast: number; stl: number; blk: number; tov: number; maxGp: number; };
  const teamMap = new Map<string, Acc>();
  for (const p of players) {
    if (!p.team || p.team === "TOT") continue;
    if (!teamMap.has(p.team)) {
      teamMap.set(p.team, { fg: 0, fga: 0, fg3: 0, fg3a: 0, ft: 0, fta: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, tov: 0, maxGp: 0 });
    }
    const t = teamMap.get(p.team)!;
    t.fg += p.fg; t.fga += p.fga;
    t.fg3 += p.threePt; t.fg3a += p.threePtA;
    t.ft += p.ft; t.fta += p.fta;
    t.pts += p.pts; t.trb += p.trb; t.ast += p.ast;
    t.stl += p.stl; t.blk += p.blk; t.tov += p.tov;
    t.maxGp = Math.max(t.maxGp, p.gp);
  }
  return Array.from(teamMap.entries()).map(([team, s]) => {
    const gp = s.maxGp || 1;
    return {
      teamId:    0,
      team,
      gp:        s.maxGp,
      pts:       s.pts / gp,
      reb:       s.trb / gp,
      ast:       s.ast / gp,
      stl:       s.stl / gp,
      blk:       s.blk / gp,
      tov:       s.tov / gp,
      fgPct:     s.fga > 0 ? s.fg / s.fga : 0,
      fg3Pct:    s.fg3a > 0 ? s.fg3 / s.fg3a : 0,
      ftPct:     s.fta > 0 ? s.ft / s.fta : 0,
      plusMinus: 0,
    };
  });
}

export function getPlayoffPlayerPerGame(): PlayoffPlayerPerGame[] {
  const rows = readCsvFile("po_player_per_game.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerPerGame);
}

export function getPlayoffPlayerTotals(): PlayoffPlayerTotals[] {
  const rows = readCsvFile("po_player_totals.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerTotals);
}

export function getPlayoffPlayerAdvanced(): PlayoffPlayerAdvanced[] {
  const rows = readCsvFile("po_player_advanced.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["PLAYER_NAME"])
    .map(mapPlayerAdvanced);
}
