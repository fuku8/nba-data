// ===== チーム =====

export interface TeamStanding {
  team: string;
  wins: number;
  losses: number;
  winPct: number;
  gb: string;
  psPerGame: number;
  paPerGame: number;
  srs: number;
  conference: "East" | "West";
}

export interface TeamPerGame {
  team: string;
  fg: number;
  fga: number;
  fgPct: number;
  threePt: number;
  threePtA: number;
  threePtPct: number;
  twoPt: number;
  twoPtA: number;
  twoPtPct: number;
  ft: number;
  fta: number;
  ftPct: number;
  orb: number;
  drb: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  pts: number;
}

export interface TeamAdvanced {
  team: string;
  wins: number;
  losses: number;
  mov: number;
  offRating: number;
  defRating: number;
  netRating: number;
  pace: number;
  srs: number;
  tsPct: number;
  efgPct: number;
}

// 統合チームデータ
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
  player: string;
  age: number;
  team: string;
  pos: string;
  gp: number;
  gs: number;
  mpg: number;
  fg: number;
  fga: number;
  fgPct: number;
  threePt: number;
  threePtA: number;
  threePtPct: number;
  twoPt: number;
  twoPtA: number;
  twoPtPct: number;
  efgPct: number;
  ft: number;
  fta: number;
  ftPct: number;
  orb: number;
  drb: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  pts: number;
}

export interface PlayerAdvanced {
  player: string;
  age: number;
  team: string;
  pos: string;
  gp: number;
  mp: number;
  per: number;
  tsPct: number;
  efgPct: number;
  usgPct: number;
  ows: number;
  dws: number;
  ws: number;
  wsPer48: number;
  obpm: number;
  dbpm: number;
  bpm: number;
  vorp: number;
  orbPct: number;
  drbPct: number;
  trbPct: number;
  astPct: number;
  stlPct: number;
  blkPct: number;
  tovPct: number;
}

export interface PlayerTotals {
  player: string;
  age: number;
  team: string;
  pos: string;
  gp: number;
  gs: number;
  mp: number;
  fg: number;
  fga: number;
  threePt: number;
  threePtA: number;
  twoPt: number;
  twoPtA: number;
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
}

// ===== プレーオフ =====

export interface PlayoffSeries {
  team1: string;
  team2: string;
  team1Wins: number;
  team2Wins: number;
  winner: string;        // 空文字列 = 進行中
  seriesStatus: string;  // "3-2" など
  round: number;         // 1=1回戦, 2=2回戦, 3=カンファレンス決勝, 4=ファイナル
  roundName: string;     // "First Round" | "Second Round" | "Conference Finals" | "Finals"
  firstGameDate: string;
  lastGameDate: string;
}

export interface PlayoffTeamStats {
  team: string;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
}

export type PlayoffPlayerPerGame = PlayerPerGame;
export type PlayoffPlayerTotals = PlayerTotals;

// ===== ソート =====

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}
