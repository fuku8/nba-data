// シーズン心電図: 全試合の点差を1本のバーストリップで表示する
// 勝ち=上(緑)・負け=下(赤)、高さ=点差。月開始マーカー付き、バークリックで試合詳細を表示
"use client";

import { useState } from "react";
import type { TeamGameMargin } from "@/lib/data/games";
import { gameDetailUrl } from "@/lib/game-url";

const BAR_W = 5;
const GAP = 2;
const HALF = 42; // 中心線から上下の最大高さ
const CAP = 30; // 点差の表示キャップ
const TOP = 13; // 月ラベル帯の高さ

// 月開始位置: 最初の試合と、前の試合から月が変わった試合
function monthStarts(games: TeamGameMargin[]): { index: number; label: string }[] {
  return games.flatMap((g, i) => {
    const month = g.gameDate.slice(5, 7);
    if (i > 0 && games[i - 1].gameDate.slice(5, 7) === month) return [];
    return [{ index: i, label: `${Number(month)}月` }];
  });
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function SeasonHeartbeat({ games }: { games: TeamGameMargin[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (games.length === 0) return null;
  const width = games.length * (BAR_W + GAP);
  const height = TOP + HALF * 2;
  const sel = selected !== null ? games[selected] : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[560px]"
          role="img"
          aria-label="シーズン全試合の点差"
        >
          {monthStarts(games).map(({ index, label }) => {
            const x = index * (BAR_W + GAP) - GAP / 2;
            return (
              <g key={index}>
                <line x1={x} y1={0} x2={x} y2={height} stroke="currentColor" strokeOpacity={0.15} />
                <text x={x + 3} y={9} fontSize={9} fill="currentColor" opacity={0.55}>
                  {label}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={TOP + HALF} x2={width} y2={TOP + HALF} stroke="currentColor" strokeOpacity={0.2} />
          {games.map((g, i) => {
            const win = g.margin > 0;
            const h = Math.max(3, (Math.min(Math.abs(g.margin), CAP) / CAP) * (HALF - 4));
            return (
              <rect
                key={`${g.gameDate}-${i}`}
                x={i * (BAR_W + GAP)}
                y={TOP + (win ? HALF - h : HALF)}
                width={BAR_W}
                height={h}
                rx={1.5}
                fill={win ? "#10b981" : "#f43f5e"}
                stroke={selected === i ? "currentColor" : "none"}
                strokeWidth={selected === i ? 1 : 0}
                className="cursor-pointer"
                onClick={() => setSelected(selected === i ? null : i)}
              >
                <title>{`${g.gameDate} vs ${g.opponent} ${g.margin > 0 ? "+" : ""}${g.margin}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      {sel && (
        <div className="mt-2 rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-muted-foreground">{sel.gameDate}</span>
            <span className="font-medium">
              {sel.isHome ? "vs" : "@"} {sel.opponent}
            </span>
            <span className={sel.margin > 0 ? "font-semibold text-emerald-500" : "font-semibold text-rose-500"}>
              {sel.margin > 0 ? "勝ち" : "負け"} {sel.teamScore}-{sel.oppScore}（{sel.margin > 0 ? "+" : ""}
              {sel.margin}）
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            FG% {pct(sel.fgPct)}（相手 {pct(sel.oppFgPct)}）・3P% {pct(sel.fg3Pct)}（相手 {pct(sel.oppFg3Pct)}）
          </div>
          <a
            href={gameDetailUrl(sel.gameId)}
            target="_blank"
            rel="noopener noreferrer"
            title="NBA.comの試合詳細を開く"
            className="mt-2 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            試合詳細 ↗
          </a>
        </div>
      )}
    </div>
  );
}
