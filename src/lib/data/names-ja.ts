import { readCsvFile, csvToObjects, num } from "./csv-utils";

// 選手・チームの日本語名対応表（plan §13-1。data/ 直下・シーズン非依存。繰越後に scripts/fetch-player-names-ja.py で再生成）
// 段階1では title・description・比較検索にだけ使い、画面表示は変えない
let playerMap: Map<number, { ja: string; en: string }> | null = null;
let teamMap: Map<string, string> | null = null;

function playerRow(playerId: number) {
  playerMap ??= new Map(
    csvToObjects(readCsvFile("player_names_ja.csv")).map((d) => [num(d["PLAYER_ID"]), { ja: d["NAME_JA"], en: d["NAME_EN"] }])
  );
  return playerMap.get(playerId);
}

export function playerNameJa(playerId: number): string | undefined {
  return playerRow(playerId)?.ja || undefined;
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

// 日本の記事でも通る定着した頭文字略称（plan §13-1 段階3）。長い姓の選手だけ。
// 定着が確認できたものだけ手で足す（既定はカタカナ姓の自動生成）
const PLAYER_NAME_SHORT: Record<number, string> = {
  1628983: "SGA", // シェイ・ギルジャス・アレクサンダー
  203484: "KCP", // ケンテイビアス・コールドウェル・ポープ
  1629638: "ニキール", // アレクサンダー・ウォーカー。日本ではファーストネームで流通（リーグに1人）
  1629008: "MPJ", // マイケル・ポーターJr.
  1642357: "ジョーンズ・ガルシア", // 英語名がハイフンなしの複合姓（David Jones Garcia）
};

// カタカナ姓（「・」区切りの末尾。Jr.・n世は姓に続けて書く。
// 複合姓も「・」区切りなので、英語名の姓のハイフンの数だけ末尾の要素を足す: Finney-Smith → フィニー・スミス）
function surnameJa(ja: string, en: string): string {
  const enSurname = en.replace(/ (Jr\.|II|III|IV)$/, "").split(" ").pop() ?? "";
  return ja.split("・").slice(-enSurname.split("-").length).join("・");
}

export function playerNameShort(playerId: number): string | undefined {
  const row = playerRow(playerId);
  return PLAYER_NAME_SHORT[playerId] ?? (row?.ja ? surnameJa(row.ja, row.en) : undefined);
}

// 表・リスト・文中用: player をフル日本語名に差し替える（対応表に無い選手は英語名のまま）。
// 表示は「表＝フル名／図内ラベル＝短縮名」で使い分ける（図は withDisplayNames）
export function withFullNames<T extends { playerId: number; player: string }>(rows: T[]): T[] {
  return rows.map((r) => {
    const ja = playerNameJa(r.playerId);
    return ja ? { ...r, player: ja } : r;
  });
}

// 図ラベル用: player を短縮表示名に差し替える。
// 同チームに同じ短縮名がいる行（兄弟・父子など8組）は日本語フル名で識別する
export function withDisplayNames<T extends { playerId: number; player: string; team: string }>(rows: T[]): T[] {
  const count = new Map<string, number>();
  for (const r of rows) {
    const s = playerNameShort(r.playerId);
    if (s) count.set(`${s}|${r.team}`, (count.get(`${s}|${r.team}`) ?? 0) + 1);
  }
  return rows.map((r) => {
    const s = playerNameShort(r.playerId);
    if (!s) return r;
    const player = (count.get(`${s}|${r.team}`) ?? 0) > 1 ? (playerNameJa(r.playerId) ?? r.player) : s;
    return { ...r, player };
  });
}
