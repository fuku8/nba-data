import { getPlayerPerGame, getPlayerAdvanced } from "@/lib/data/players";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { MIN_GP, PO_MIN_GP } from "@/lib/data/player-types";
import type { Phase } from "@/lib/phase";
import { currentSeason } from "@/lib/season";
import { PreSeasonNotice } from "@/components/phase-switch";
import { PlayersClient } from "./client";
import type { QuadrantDot } from "@/components/quadrant-map";
import { playerNameJa, withDisplayNames } from "@/lib/data/names-ja";

const SHOOTER_MIN_3PA = 1.0;

// フェーズはパス区分（/players = RS, /players/po = PO）。page.tsx と po/page.tsx から呼ぶ（plan.md §12-11）
export function renderPlayers(phase: Phase) {
  const poAvailable = isPlayoffDataAvailable();
  if (phase === "po" && !poAvailable) return <PreSeasonNotice />;
  const minGp = phase === "po" ? PO_MIN_GP : MIN_GP;
  const perGame = getPlayerPerGame({ phase }).filter((p) => p.team !== "TOT");
  const advanced = getPlayerAdvanced({ phase }).filter((p) => p.team !== "TOT");

  // 図ラベルは日本語の短縮名（plan §13-1 段階3。表の表示は英語名のまま）
  const usageEfficiencyDots: QuadrantDot[] = withDisplayNames(advanced.filter((p) => p.gp >= minGp))
    .map((p) => ({ playerId: p.playerId, name: p.player, team: p.team, x: p.usgPct, y: p.tsPct }));

  // 検索照合用の日本語名（plan §13-1）。ページに居る選手分だけ渡す
  const namesJa: Record<number, string> = {};
  for (const p of perGame) {
    const ja = playerNameJa(p.playerId);
    if (ja) namesJa[p.playerId] = ja;
  }

  // 表の表示用の短縮名（段階3後半）。検索照合は英語名フィールドを使い続けるため表示専用のマップで渡す。
  // 同チーム同姓のフル名フォールバックは行（playerId-team）単位
  const namesShort: Record<string, string> = {};
  for (const p of withDisplayNames([...perGame, ...advanced])) {
    namesShort[`${p.playerId}-${p.team}`] = p.player;
  }

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
      namesShort={namesShort}
      usageEfficiencyDots={usageEfficiencyDots}
      shooterDots={shooterDots}
      minGp={minGp}
      shooterMin3pa={SHOOTER_MIN_3PA}
    />
  );
}
