// ===== チーム =====

export interface TeamStanding {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  conference: "East" | "West";
  wins: number;
  losses: number;
  winPct: number;
  conferenceGb: string;
  playoffRank: number;
  pointsPg: number;
  oppPointsPg: number;
  diffPointsPg: number;
  home: string;
  road: string;
  l10: string;
  currentStreak: string;
  clinchedPlayoff: number;
}

export interface TeamPerGame {
  teamId: number;
  teamName: string;
  gp: number;
  wins: number;
  losses: number;
  winPct: number;
  min: number;
  fgm: number;
  fga: number;
  fgPct: number;
  fg3m: number;
  fg3a: number;
  fg3Pct: number;
  ftm: number;
  fta: number;
  ftPct: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  tov: number;
  stl: number;
  blk: number;
  blka: number;
  pf: number;
  pfd: number;
  pts: number;
  plusMinus: number;
}

export interface TeamAdvanced {
  teamId: number;
  teamName: string;
  gp: number;
  offRating: number;
  defRating: number;
  netRating: number;
  astPct: number;
  astTo: number;
  astRatio: number;
  orebPct: number;
  drebPct: number;
  rebPct: number;
  tmTovPct: number;
  efgPct: number;
  tsPct: number;
  pace: number;
  poss: number;
  pie: number;
}

export interface TeamData {
  info: TeamInfo;
  standing: TeamStanding;
  perGame: TeamPerGame;
  advanced: TeamAdvanced;
}

export interface TeamInfo {
  name: string;
  abbreviation: string;
  conference: "East" | "West";
  division: string;
  primaryColor: string;
  secondaryColor: string;
}

// ===== 選手 =====

export interface PlayerPerGame {
  playerId: number;
  player: string;
  teamId: number;
  team: string;
  age: number;
  gp: number;
  wins: number;
  losses: number;
  winPct: number;
  mpg: number;
  fg: number;
  fga: number;
  fgPct: number;
  threePt: number;
  threePtA: number;
  threePtPct: number;
  ft: number;
  fta: number;
  ftPct: number;
  orb: number;
  drb: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  blka: number;
  tov: number;
  pf: number;
  pfd: number;
  pts: number;
  plusMinus: number;
  dd2: number;
  td3: number;
}

export interface PlayerAdvanced {
  playerId: number;
  player: string;
  teamId: number;
  team: string;
  age: number;
  gp: number;
  mp: number;
  offRating: number;
  defRating: number;
  netRating: number;
  astPct: number;
  astTo: number;
  astRatio: number;
  orebPct: number;
  drebPct: number;
  rebPct: number;
  tmTovPct: number;
  efgPct: number;
  tsPct: number;
  usgPct: number;
  pace: number;
  pie: number;
  poss: number;
}

export interface PlayerTotals {
  playerId: number;
  player: string;
  teamId: number;
  team: string;
  age: number;
  gp: number;
  mp: number;
  fg: number;
  fga: number;
  threePt: number;
  threePtA: number;
  ft: number;
  fta: number;
  orb: number;
  drb: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  pts: number;
  plusMinus: number;
}

// ===== プレーオフ =====

export interface PlayoffSeries {
  team1: string;
  team2: string;
  team1Wins: number;
  team2Wins: number;
  winner: string;
  seriesStatus: string;
  round: number;
  roundName: string;
  firstGameDate: string;
  lastGameDate: string;
}

export interface PlayoffTeamStats {
  teamId: number;
  team: string;
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  plusMinus: number;
}

export type PlayoffPlayerPerGame = PlayerPerGame;
export type PlayoffPlayerTotals = PlayerTotals;
export type PlayoffPlayerAdvanced = PlayerAdvanced;

// ===== ソート =====

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}
