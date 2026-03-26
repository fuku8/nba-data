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

// ===== ソート =====

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}
