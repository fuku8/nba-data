import { readCsvFile, csvToObjects, num, dataStamp } from "./csv-utils";
import { getTeamAbbr } from "@/lib/constants/teams";
import { getPlayerTotals } from "./players";
import type { TeamStanding, TeamPerGame, TeamAdvanced, PlayerTotals } from "@/lib/types";

export function getStandings(): TeamStanding[] {
  const rows = readCsvFile("standings.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["TEAM_NAME"])
    .map((d) => ({
      teamId:          num(d["TEAM_ID"]),
      teamName:        d["TEAM_NAME"] || "",
      teamAbbr:        d["TEAM_ABBREVIATION"] || getTeamAbbr(d["TEAM_NAME"] || ""),
      conference:      (d["CONFERENCE"] as "East" | "West") || "East",
      wins:            num(d["WINS"]),
      losses:          num(d["LOSSES"]),
      winPct:          num(d["WIN_PCT"]),
      conferenceGb:    (d["CONFERENCE_GB"] && d["CONFERENCE_GB"] !== "0.0") ? d["CONFERENCE_GB"] : "—",
      playoffRank:     num(d["PLAYOFF_RANK"]),
      pointsPg:        num(d["POINTS_PG"]),
      oppPointsPg:     num(d["OPP_POINTS_PG"]),
      diffPointsPg:    num(d["DIFF_POINTS_PG"]),
      home:            d["HOME"] || "",
      road:            d["ROAD"] || "",
      l10:             d["L10"] || "",
      currentStreak:   d["CURRENT_STREAK"] || "",
      clinchedPlayoff: num(d["CLINCHED_PLAYOFF"]),
    }));
}

export function getTeamPerGame(): TeamPerGame[] {
  const rows = readCsvFile("team_per_game.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["TEAM_NAME"])
    .map((d) => ({
      teamId:    num(d["TEAM_ID"]),
      teamName:  d["TEAM_NAME"] || "",
      gp:        num(d["GP"]),
      wins:      num(d["W"]),
      losses:    num(d["L"]),
      winPct:    num(d["W_PCT"]),
      min:       num(d["MIN"]),
      fgm:       num(d["FGM"]),
      fga:       num(d["FGA"]),
      fgPct:     num(d["FG_PCT"]),
      fg3m:      num(d["FG3M"]),
      fg3a:      num(d["FG3A"]),
      fg3Pct:    num(d["FG3_PCT"]),
      ftm:       num(d["FTM"]),
      fta:       num(d["FTA"]),
      ftPct:     num(d["FT_PCT"]),
      oreb:      num(d["OREB"]),
      dreb:      num(d["DREB"]),
      reb:       num(d["REB"]),
      ast:       num(d["AST"]),
      tov:       num(d["TOV"]),
      stl:       num(d["STL"]),
      blk:       num(d["BLK"]),
      blka:      num(d["BLKA"]),
      pf:        num(d["PF"]),
      pfd:       num(d["PFD"]),
      pts:       num(d["PTS"]),
      plusMinus: num(d["PLUS_MINUS"]),
    }));
}

export function getTeamAdvanced(): TeamAdvanced[] {
  const rows = readCsvFile("team_advanced.csv");
  const data = csvToObjects(rows);
  return data
    .filter((d) => d["TEAM_NAME"])
    .map((d) => ({
      teamId:    num(d["TEAM_ID"]),
      teamName:  d["TEAM_NAME"] || "",
      gp:        num(d["GP"]),
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
      pace:      num(d["PACE"]),
      poss:      num(d["POSS"]),
      pie:       num(d["PIE"]),
    }));
}

// ワンマン度: チーム内得点分布のGini係数
export function gini(values: number[]): number {
  const xs = [...values].sort((a, b) => a - b);
  const n = xs.length;
  const sum = xs.reduce((a, b) => a + b, 0);
  if (n === 0 || sum === 0) return 0;
  let acc = 0;
  xs.forEach((x, i) => {
    acc += (2 * (i + 1) - n - 1) * x;
  });
  return acc / (n * sum);
}

export const GINI_MIN_MP = 200;

// プロセス生存中キャッシュ。CSVのmtimeで無効化するのでローカルでCSV差し替えても再起動不要
let cached: { stamp: string; value: { team: string; gini: number; players: PlayerTotals[] }[] } | null = null;

// チーム別・得点分布Giniのリーグ内ランキング（Gini降順）。MIN200未満・TOTは除外
export function getTeamPointsGini(): { team: string; gini: number; players: PlayerTotals[] }[] {
  const stamp = dataStamp(["player_totals.csv"]);
  if (cached && cached.stamp === stamp) return cached.value;

  const totals = getPlayerTotals().filter((p) => p.mp >= GINI_MIN_MP && p.team !== "TOT");
  const teamPlayers = new Map<string, PlayerTotals[]>();
  for (const p of totals) {
    if (!teamPlayers.has(p.team)) teamPlayers.set(p.team, []);
    teamPlayers.get(p.team)!.push(p);
  }

  const value = [...teamPlayers.entries()]
    .map(([team, players]) => ({
      team,
      gini: gini(players.map((p) => p.pts)),
      players: [...players].sort((a, b) => b.pts - a.pts),
    }))
    .sort((a, b) => b.gini - a.gini);

  cached = { stamp, value };
  return value;
}
