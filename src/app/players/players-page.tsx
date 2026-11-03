import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals, getRoster } from "@/lib/data/players";
import { allPlayerIds } from "@/app/players/[...slug]/player-page";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { rsMinGp, PO_MIN_GP } from "@/lib/data/player-types";
import type { Phase } from "@/lib/phase";
import { currentSeason } from "@/lib/season";
import { PreSeasonNotice } from "@/components/phase-switch";
import { PlayersClient } from "./client";
import type { QuadrantDot } from "@/components/quadrant-map";
import { playerNameJa, withDisplayNames } from "@/lib/data/names-ja";
import { getLatestGameDate } from "@/lib/data/games";
import { getPoLastGameDate } from "@/lib/data/csv-utils";

// 3PAは図の横軸そのものなので、本数で絞っても分布は歪まず左端が切れるだけ（NBA公式の3P%資格と同じ発想）
const SHOOTER_MIN_3PA = 4.0;
// USG%×TS% 図は各チームの出場時間上位N人（MPG一律より点数が安定し、全チームが図に登場する）
const MAP_TEAM_TOP = 5;

// フェーズはパス区分（/players = RS, /players/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderPlayers(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const minGp = phase === "po" ? PO_MIN_GP : rsMinGp();
  const perGame = getPlayerPerGame({ phase }).filter((p) => p.team !== "TOT");
  const advanced = getPlayerAdvanced({ phase }).filter((p) => p.team !== "TOT");

  // 各チームの出場時間合計 上位N人だけを図に載せる
  const teamTop = new Map<string, { id: number; mp: number }[]>();
  for (const t of getPlayerTotals({ phase })) {
    if (t.team === "TOT") continue;
    const list = teamTop.get(t.team) ?? [];
    list.push({ id: t.playerId, mp: t.mp });
    teamTop.set(t.team, list);
  }
  const mapKeys = new Set<string>();
  for (const [team, list] of teamTop) {
    for (const p of [...list].sort((a, b) => b.mp - a.mp).slice(0, MAP_TEAM_TOP)) mapKeys.add(`${p.id}-${team}`);
  }

  // 図ラベルは日本語の短縮名（plan §13-1 段階3。表の表示はフル日本語名＝namesJa）
  const usageEfficiencyDots: QuadrantDot[] = withDisplayNames(advanced.filter((p) => mapKeys.has(`${p.playerId}-${p.team}`)))
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.usgPct, y: p.tsPct }));

  // 検索照合＋表の表示に使う日本語フル名（plan §13-1）。ページに居る選手分だけ渡す
  const namesJa: Record<number, string> = {};
  for (const p of perGame) {
    const ja = playerNameJa(p.playerId);
    if (ja) namesJa[p.playerId] = ja;
  }

  // 名簿に居て今季まだ出場の無い選手。表には載せず、検索したときだけ表の下に出す（2026-11-03 ふくたろう決定・RS のみ。
  // PO は出場しない選手が名簿に多く残るため対象外）。過去季にも成績の無い選手は選手ページが無いので、チームページの
  // ロスターと同じくリンクにしない
  const played = new Set(perGame.map((p) => p.playerId));
  const withPage = new Set(allPlayerIds());
  const unplayed = phase === "rs"
    ? getRoster().filter((r) => !played.has(r.playerId)).map((r) => ({
        playerId: r.playerId, player: r.player, team: r.team, playerJa: playerNameJa(r.playerId) ?? null, hasPage: withPage.has(r.playerId),
      }))
    : [];

  const shooterDots: QuadrantDot[] = withDisplayNames(perGame.filter((p) => p.gp >= minGp && p.threePtA >= SHOOTER_MIN_3PA))
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.threePtA, y: p.threePtPct }));

  return (
    <PlayersClient
      key={phase}
      phase={phase}
      season={currentSeason()}
      poAvailable={poAvailable}
      perGame={perGame}
      advanced={advanced}
      namesJa={namesJa}
      unplayed={unplayed}
      usageEfficiencyDots={usageEfficiencyDots}
      shooterDots={shooterDots}
      minGp={minGp}
      shooterMin3pa={SHOOTER_MIN_3PA}
      mapTeamTop={MAP_TEAM_TOP}
      asOf={phase === "po" ? getPoLastGameDate() : getLatestGameDate()}
    />
  );
}
