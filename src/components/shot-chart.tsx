// ショットチャート: ハーフコートに全試投を成功/失敗で描画
// サーバーコンポーネント・純SVG。座標はNBA標準（原点=リング中心、1単位=0.1ft）

import type { Shot } from "@/lib/data/shots";

const W = 500; // LOC_X -250..250
const H = 470; // ベースライン(y=-47.5)からハーフコートライン付近まで
const MAX_Y = 422.5; // チャート描画範囲の上限（これを超えるバックコートのヒーブは描画対象外）
const sx = (x: number) => x + 250;
const sy = (y: number) => MAX_Y - y;

// 3Pアークとコーナー直線の接点: x=±220, y=sqrt(237.5²-220²)≈89.5
const ARC_Y = Math.sqrt(237.5 ** 2 - 220 ** 2);

function CourtLines() {
  const stroke = { stroke: "currentColor", strokeOpacity: 0.3, fill: "none" } as const;
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} {...stroke} />
      {/* リング・バックボード */}
      <circle cx={sx(0)} cy={sy(0)} r={7.5} {...stroke} />
      <line x1={sx(-30)} y1={sy(-7.5)} x2={sx(30)} y2={sy(-7.5)} {...stroke} />
      {/* ペイント・フリースローサークル */}
      <rect x={sx(-80)} y={sy(142.5)} width={160} height={190} {...stroke} />
      <circle cx={sx(0)} cy={sy(142.5)} r={60} {...stroke} />
      {/* 制限区域アーク */}
      <path d={`M${sx(-40)},${sy(0)} A40,40 0 0 1 ${sx(40)},${sy(0)}`} {...stroke} />
      {/* 3Pライン */}
      <line x1={sx(-220)} y1={sy(-47.5)} x2={sx(-220)} y2={sy(ARC_Y)} {...stroke} />
      <line x1={sx(220)} y1={sy(-47.5)} x2={sx(220)} y2={sy(ARC_Y)} {...stroke} />
      <path d={`M${sx(-220)},${sy(ARC_Y)} A237.5,237.5 0 0 1 ${sx(220)},${sy(ARC_Y)}`} {...stroke} />
    </g>
  );
}

export function ShotChart({ shots }: { shots: Shot[] }) {
  if (shots.length === 0) return null;
  // 凡例の成功/失敗/FG%は全試投（バックコートのヒーブ含む）で集計する
  const made = shots.filter(([, , m]) => m === 1);
  const missed = shots.filter(([, , m]) => m !== 1);
  const pct = (made.length / shots.length) * 100;
  // 描画はチャート内（バックコートのヒーブを除く）のみ
  const drawnMade = made.filter(([, y]) => y <= MAX_Y);
  const drawnMissed = missed.filter(([, y]) => y <= MAX_Y);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[440px]" role="img" aria-label="ショットチャート">
        <CourtLines />
        {drawnMissed.map(([x, y], i) => (
          <circle key={`m${i}`} cx={sx(x)} cy={sy(y)} r={3.2} fill="#64748b" fillOpacity={0.4} />
        ))}
        {drawnMade.map(([x, y], i) => (
          <circle key={`o${i}`} cx={sx(x)} cy={sy(y)} r={3.2} fill="#10b981" fillOpacity={0.65} />
        ))}
      </svg>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full inline-block bg-emerald-500" />
          成功 {made.length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full inline-block bg-slate-500 opacity-60" />
          失敗 {missed.length}
        </span>
        <span>FG {pct.toFixed(1)}%（{shots.length}本）</span>
      </div>
    </div>
  );
}
