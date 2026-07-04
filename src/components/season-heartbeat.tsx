// シーズン心電図: 全試合の点差を1本のバーストリップで表示する
// 勝ち=上(緑)・負け=下(赤)、高さ=点差。サーバーコンポーネント・純SVG

import type { TeamGameMargin } from "@/lib/data/games";

const BAR_W = 5;
const GAP = 2;
const HALF = 42; // 中心線から上下の最大高さ
const CAP = 30; // 点差の表示キャップ

export function SeasonHeartbeat({ games }: { games: TeamGameMargin[] }) {
  if (games.length === 0) return null;
  const width = games.length * (BAR_W + GAP);
  const height = HALF * 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[560px]"
        role="img"
        aria-label="シーズン全試合の点差"
      >
        <line x1={0} y1={HALF} x2={width} y2={HALF} stroke="currentColor" strokeOpacity={0.2} />
        {games.map((g, i) => {
          const win = g.margin > 0;
          const h = Math.max(3, (Math.min(Math.abs(g.margin), CAP) / CAP) * (HALF - 4));
          return (
            <rect
              key={`${g.gameDate}-${i}`}
              x={i * (BAR_W + GAP)}
              y={win ? HALF - h : HALF}
              width={BAR_W}
              height={h}
              rx={1.5}
              fill={win ? "#10b981" : "#f43f5e"}
            >
              <title>{`${g.gameDate} vs ${g.opponent} ${g.margin > 0 ? "+" : ""}${g.margin}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
