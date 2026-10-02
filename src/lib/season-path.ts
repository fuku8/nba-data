// 過去季に残すページの URL（plan.md §13-10・2026-10-02 決定）。季はパスに入れる:
// /standings/2025-26・/leaders/2025-26・/leaders/po/2025-26・/playoffs/2025-26・/playoffs/2025-26/NYK-SAS。
// 今季は季を付けない。fs を読まないので、クライアント部品（ナビ）からも使える
export const SEASON_RE = /^\d{4}-\d{2}$/;

// pastSeason が undefined（＝今季）なら basePath のまま
export const seasonPath = (basePath: string, pastSeason?: string) => (pastSeason ? `${basePath}/${pastSeason}` : basePath);

// 選手ページは1人1ページで季はタブ。過去季のページから来たときは、その季のタブを開いた状態にする（HashTabs が読む）
export const playerHref = (playerId: number | string, pastSeason?: string) =>
  pastSeason ? `/players/${playerId}#${pastSeason}` : `/players/${playerId}`;

// ボックススコアの URL（/games/<gameId>）には季が無い。NBA の gameId は 4〜5 桁目がシーズン開始年の下2桁
// （0042500101 → 2025-26）なので、そこから求める
function seasonOfGameId(gameId = ""): string | undefined {
  if (!/^00\d{8}$/.test(gameId)) return undefined;
  const yy = parseInt(gameId.slice(3, 5), 10);
  return `20${String(yy).padStart(2, "0")}-${String((yy + 1) % 100).padStart(2, "0")}`;
}

// いま見ているページが過去季ならその季、今季（または季に依らないページ）なら undefined。ナビの出し分けに使う
export function pastSeasonOf(pathname: string, current: string): string | undefined {
  const segs = pathname.split("/").filter(Boolean);
  const season = segs.find((s) => SEASON_RE.test(s)) ?? (segs[0] === "games" ? seasonOfGameId(segs[1]) : undefined);
  return season && season !== current ? season : undefined;
}
