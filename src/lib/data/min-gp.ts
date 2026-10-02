import { csvToObjects, num, readCsvFile } from "./csv-utils.ts";
import { currentSeason } from "../season.ts";

// RS の相対評価（パーセンタイル・タイプ・マップ・似た選手）の母集団を回転選手に絞る GP 下限（シーズンを通した値）
export const MIN_GP = 20;

// 序盤の下限: リーグ最多出場試合数の半分を 5〜cap に収める（plan.md §12-4「序盤のGP下限」）。
// 固定のままだと開幕から約2か月、誰も下限に届かず図が全員ぶん消える。「出場率5割以上＝ローテ選手」の意味は保たれ、
// 最多が cap×2 試合に届けば以後は cap で固定になる
export const earlyMinGp = (leagueMaxGp: number, cap = MIN_GP) => Math.min(cap, Math.max(5, Math.round(leagueMaxGp * 0.5)));

const leagueMaxGp = () => Math.max(0, ...csvToObjects(readCsvFile("player_per_game.csv")).map((d) => num(d["GP"])));

// 指定シーズンの RS の GP 下限。過去季は確定データなので MIN_GP、現季だけ序盤の下限を使う
export function rsMinGp(season?: string): number {
  if (season && season !== currentSeason()) return MIN_GP;
  return earlyMinGp(leagueMaxGp());
}

// 比較ページの検索対象になる RS の GP 下限（通常10）。序盤は母集団の下限を超えないようにする（検索対象が空にならないため）。
// 選手ページの「似たタイプの選手」リンクも同じ値で出し分ける（比較ページに居ない選手からリンクを出さない）
export function compareListMinGp(season?: string): number {
  return Math.min(10, rsMinGp(season));
}

// リーダー（トップの3枚・/leaders）の GP 下限。序盤は誰も30試合に達しないため「最多の半分」にし、
// 30 に届いたら以後は固定（bleague-data minGp と同型の暫定ゲート）。過去季は確定データなので 30
export function leaderMinGp(season?: string): number {
  if (season && season !== currentSeason()) return 30;
  return Math.min(30, Math.max(1, Math.floor(leagueMaxGp() / 2)));
}
