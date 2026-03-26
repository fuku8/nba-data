import type { TeamInfo } from "@/lib/types";

export const NBA_TEAMS: Record<string, TeamInfo> = {
  ATL: { name: "Atlanta Hawks", abbreviation: "ATL", conference: "East", division: "Southeast", primaryColor: "#E03A3E", secondaryColor: "#C1D32F" },
  BOS: { name: "Boston Celtics", abbreviation: "BOS", conference: "East", division: "Atlantic", primaryColor: "#007A33", secondaryColor: "#BA9653" },
  BKN: { name: "Brooklyn Nets", abbreviation: "BKN", conference: "East", division: "Atlantic", primaryColor: "#000000", secondaryColor: "#FFFFFF" },
  CHA: { name: "Charlotte Hornets", abbreviation: "CHA", conference: "East", division: "Southeast", primaryColor: "#1D1160", secondaryColor: "#00788C" },
  CHI: { name: "Chicago Bulls", abbreviation: "CHI", conference: "East", division: "Central", primaryColor: "#CE1141", secondaryColor: "#000000" },
  CLE: { name: "Cleveland Cavaliers", abbreviation: "CLE", conference: "East", division: "Central", primaryColor: "#860038", secondaryColor: "#041E42" },
  DAL: { name: "Dallas Mavericks", abbreviation: "DAL", conference: "West", division: "Southwest", primaryColor: "#00538C", secondaryColor: "#002B5E" },
  DEN: { name: "Denver Nuggets", abbreviation: "DEN", conference: "West", division: "Northwest", primaryColor: "#0E2240", secondaryColor: "#FEC524" },
  DET: { name: "Detroit Pistons", abbreviation: "DET", conference: "East", division: "Central", primaryColor: "#C8102E", secondaryColor: "#006BB6" },
  GSW: { name: "Golden State Warriors", abbreviation: "GSW", conference: "West", division: "Pacific", primaryColor: "#1D428A", secondaryColor: "#FFC72C" },
  HOU: { name: "Houston Rockets", abbreviation: "HOU", conference: "West", division: "Southwest", primaryColor: "#CE1141", secondaryColor: "#000000" },
  IND: { name: "Indiana Pacers", abbreviation: "IND", conference: "East", division: "Central", primaryColor: "#002D62", secondaryColor: "#FDBB30" },
  LAC: { name: "Los Angeles Clippers", abbreviation: "LAC", conference: "West", division: "Pacific", primaryColor: "#C8102E", secondaryColor: "#1D428A" },
  LAL: { name: "Los Angeles Lakers", abbreviation: "LAL", conference: "West", division: "Pacific", primaryColor: "#552583", secondaryColor: "#FDB927" },
  MEM: { name: "Memphis Grizzlies", abbreviation: "MEM", conference: "West", division: "Southwest", primaryColor: "#5D76A9", secondaryColor: "#12173F" },
  MIA: { name: "Miami Heat", abbreviation: "MIA", conference: "East", division: "Southeast", primaryColor: "#98002E", secondaryColor: "#F9A01B" },
  MIL: { name: "Milwaukee Bucks", abbreviation: "MIL", conference: "East", division: "Central", primaryColor: "#00471B", secondaryColor: "#EEE1C6" },
  MIN: { name: "Minnesota Timberwolves", abbreviation: "MIN", conference: "West", division: "Northwest", primaryColor: "#0C2340", secondaryColor: "#236192" },
  NOP: { name: "New Orleans Pelicans", abbreviation: "NOP", conference: "West", division: "Southwest", primaryColor: "#0C2340", secondaryColor: "#C8102E" },
  NYK: { name: "New York Knicks", abbreviation: "NYK", conference: "East", division: "Atlantic", primaryColor: "#006BB6", secondaryColor: "#F58426" },
  OKC: { name: "Oklahoma City Thunder", abbreviation: "OKC", conference: "West", division: "Northwest", primaryColor: "#007AC1", secondaryColor: "#EF6020" },
  ORL: { name: "Orlando Magic", abbreviation: "ORL", conference: "East", division: "Southeast", primaryColor: "#0077C0", secondaryColor: "#C4CED4" },
  PHI: { name: "Philadelphia 76ers", abbreviation: "PHI", conference: "East", division: "Atlantic", primaryColor: "#006BB6", secondaryColor: "#ED174C" },
  PHX: { name: "Phoenix Suns", abbreviation: "PHX", conference: "West", division: "Pacific", primaryColor: "#1D1160", secondaryColor: "#E56020" },
  POR: { name: "Portland Trail Blazers", abbreviation: "POR", conference: "West", division: "Northwest", primaryColor: "#E03A3E", secondaryColor: "#000000" },
  SAC: { name: "Sacramento Kings", abbreviation: "SAC", conference: "West", division: "Pacific", primaryColor: "#5A2D81", secondaryColor: "#63727A" },
  SAS: { name: "San Antonio Spurs", abbreviation: "SAS", conference: "West", division: "Southwest", primaryColor: "#C4CED4", secondaryColor: "#000000" },
  TOR: { name: "Toronto Raptors", abbreviation: "TOR", conference: "East", division: "Atlantic", primaryColor: "#CE1141", secondaryColor: "#000000" },
  UTA: { name: "Utah Jazz", abbreviation: "UTA", conference: "West", division: "Northwest", primaryColor: "#002B5C", secondaryColor: "#00471B" },
  WAS: { name: "Washington Wizards", abbreviation: "WAS", conference: "East", division: "Southeast", primaryColor: "#002B5C", secondaryColor: "#E31837" },
};

// チーム名 → 略称の逆引き
const teamNameToAbbr: Record<string, string> = {};
for (const [abbr, info] of Object.entries(NBA_TEAMS)) {
  teamNameToAbbr[info.name] = abbr;
}

export function getTeamAbbr(teamName: string): string {
  // "(2)" 等の順位番号を除去
  const cleaned = teamName.replace(/\s*\(\d+\)\s*$/, "").trim();
  return teamNameToAbbr[cleaned] || cleaned;
}

export function getTeamInfo(abbr: string): TeamInfo | undefined {
  return NBA_TEAMS[abbr];
}

export function getTeamColor(abbr: string): string {
  return NBA_TEAMS[abbr]?.primaryColor || "#666666";
}
