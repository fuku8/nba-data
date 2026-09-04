import { readCsvFile, csvToObjects, num } from "./csv-utils";

// 選手・チームの日本語名対応表（plan §13-1。data/ 直下・シーズン非依存。繰越後に scripts/fetch-player-names-ja.py で再生成）
// 段階1では title・description・比較検索にだけ使い、画面表示は変えない
let playerMap: Map<number, string> | null = null;
let teamMap: Map<string, string> | null = null;

export function playerNameJa(playerId: number): string | undefined {
  playerMap ??= new Map(
    csvToObjects(readCsvFile("player_names_ja.csv")).map((d) => [num(d["PLAYER_ID"]), d["NAME_JA"]])
  );
  return playerMap.get(playerId) || undefined;
}

export function teamNameJa(abbr: string): string | undefined {
  teamMap ??= new Map(
    csvToObjects(readCsvFile("team_names_ja.csv")).map((d) => [d["TEAM_ABBREVIATION"], d["NAME_JA"]])
  );
  return teamMap.get(abbr) || undefined;
}

// クライアントコンポーネントに props で渡す用（略称 → 日本語名）
export function allTeamNamesJa(): Record<string, string> {
  teamNameJa("OKC"); // teamMap を初期化
  return Object.fromEntries(teamMap!);
}
