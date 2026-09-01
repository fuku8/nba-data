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

// ── チーム色の暗背景対策（plan.md §12-12） ──────────────────────────
// html.dark の --background は oklch(0.145 0 0) ≒ #0a0a0a。30チーム中16チームのプライマリ色は
// この背景に対して非テキストマークの自前基準 3:1（feel-viz README §アクセシビリティ）を割る（PHX/DEN/MIN は1.2台）。
// 規則: primary が 3:1 以上ならそのまま → secondary が 3:1 以上なら secondary → 両方NGなら primary を白と混ぜて 3:1 に達する最小明度
const DARK_BG = "#0a0a0a";
const MIN_CONTRAST = 3;

const hexToRgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const rgbToHex = (rgb: number[]) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function luminance(hex: string): number {
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = hexToRgb(hex).map((v) => f(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG コントラスト比（1〜21）
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// 暗背景で見える色に解決する。色相は保ち、明度だけを最小限上げる
export function onDarkColor(primary: string, secondary: string, bg = DARK_BG): string {
  if (contrastRatio(primary, bg) >= MIN_CONTRAST) return primary;
  if (contrastRatio(secondary, bg) >= MIN_CONTRAST) return secondary;
  const base = hexToRgb(primary);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const mixed = rgbToHex(base.map((v) => v + (255 - v) * t));
    if (contrastRatio(mixed, bg) >= MIN_CONTRAST) return mixed;
  }
  return "#ffffff";
}

// 30チーム分をモジュール読み込み時に1回だけ解決（静的ビルドなので実行時コストなし）
const TEAM_COLOR_ON_DARK: Record<string, string> = Object.fromEntries(
  Object.entries(NBA_TEAMS).map(([abbr, t]) => [abbr, onDarkColor(t.primaryColor, t.secondaryColor)]),
);

// チーム色（暗背景で 3:1 以上になるよう解決済み）。生のプライマリ色が要る場合は NBA_TEAMS[abbr].primaryColor
export function getTeamColor(abbr: string): string {
  return TEAM_COLOR_ON_DARK[abbr] || "#666666";
}
