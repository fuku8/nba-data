import { readCsvFile, csvToObjects, num } from "./csv-utils";
import { getPlayerPerGame, getPlayerTotals, getPlayerAdvanced } from "./players";
import { getStandings } from "./teams";
import { getTeamAbbr } from "@/lib/constants/teams";
import { buildBracket, type Bracket, type SeedInfo } from "@/lib/bracket";
import type {
  PlayoffSeries,
  PlayoffTeamStats,
  PlayoffPlayerPerGame,
  PlayoffPlayerTotals,
  PlayoffPlayerAdvanced,
} from "@/lib/types";

export function isPlayoffDataAvailable(season?: string): boolean {
  const rows = readCsvFile("po_player_per_game.csv", season);
  return rows.length > 1;
}

export function getPlayoffSeries(season?: string): PlayoffSeries[] {
  const rows = readCsvFile("po_series.csv", season);
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

// ブラケット木の配置（シードは standings の PLAYOFF_RANK＝RS順位。配置規則は src/lib/bracket.ts）
export function getPlayoffBracket(season?: string): Bracket {
  const seeds = new Map<string, SeedInfo>(
    getStandings(season).map((s) => [s.teamAbbr, { conference: s.conference, seed: s.playoffRank }]),
  );
  return buildBracket(getPlayoffSeries(season), seeds, getTeamAbbr);
}

export function getPlayoffTeamStats(season?: string): PlayoffTeamStats[] {
  // po_team_per_game.csv は現在未生成のため、po_player_totals.csv から集計
  const players = getPlayoffPlayerTotals(season);
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

// RS版ローダーの phase:"po" 呼び出しと同じ。season 省略＝現シーズン
export const getPlayoffPlayerPerGame = (season?: string): PlayoffPlayerPerGame[] => getPlayerPerGame({ season, phase: "po" });
export const getPlayoffPlayerTotals = (season?: string): PlayoffPlayerTotals[] => getPlayerTotals({ season, phase: "po" });
export const getPlayoffPlayerAdvanced = (season?: string): PlayoffPlayerAdvanced[] => getPlayerAdvanced({ season, phase: "po" });
