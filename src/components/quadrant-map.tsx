"use client";

// 汎用象限マップ: 中央値クロスの散布図。点にホバーで選手名、クリックで固定（タッチ用）→名前クリックで個人ページへ遷移。
// ブラウザ標準の <title> ツールチップは約1秒静止しないと出ず、タッチでは出ないので使わない
// 点はキーボード操作の対象にしない（150超の点を全部タブ停止にすると逆に操作性が落ちる。数値は同ページの表で読める）

import { useState } from "react";
import Link from "next/link";
import { getTeamColor } from "@/lib/constants/teams";

export interface QuadrantDot {
  playerId: number;
  name: string;
  team: string;
  x: number;
  y: number;
}

// サーバーコンポーネントからも渡せるよう、関数ではなく書式キー
export type AxisFormat = "pct" | "1f" | "2f";
const fmt = (v: number, f: AxisFormat) => (f === "pct" ? `${(v * 100).toFixed(1)}%` : v.toFixed(f === "1f" ? 1 : 2));

const W = 640;
const H = 420;
const PAD = { l: 50, r: 16, t: 20, b: 40 };

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

export function QuadrantMap({
  dots,
  xLabel,
  yLabel,
  xFormat = "2f",
  yFormat = "2f",
  quadrantLabels,
  labelTop = 0,
}: {
  dots: QuadrantDot[];
  xLabel: string;
  yLabel: string;
  xFormat?: AxisFormat;
  yFormat?: AxisFormat;
  /** 四隅の説明（右上・左上・右下・左下） */
  quadrantLabels?: [string, string, string, string];
  /** x 上位 N 人に常時名前を出す */
  labelTop?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  if (dots.length === 0) return null;

  const xs = dots.map((d) => d.x).sort((a, b) => a - b);
  const ys = dots.map((d) => d.y).sort((a, b) => a - b);
  const xMed = median(xs);
  const yMed = median(ys);
  const xPad = (xs[xs.length - 1] - xs[0]) * 0.05 || 1;
  const yPad = (ys[ys.length - 1] - ys[0]) * 0.05 || 1;
  const x0 = xs[0] - xPad;
  const x1 = xs[xs.length - 1] + xPad;
  const y0 = ys[0] - yPad;
  const y1 = ys[ys.length - 1] + yPad;

  const sx = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const midX = (PAD.l + W - PAD.r) / 2;

  const alwaysLabeled = new Set([...dots].sort((a, b) => b.x - a.x).slice(0, labelTop).map((d) => d.playerId));

  // 固定（クリック）を優先し、無ければホバー中の点
  const shownId = selected ?? hovered;
  const shownDot = shownId != null ? dots.find((d) => d.playerId === shownId) : undefined;

  // ラベル位置: ドット近傍からスタートし、viewBoxをはみ出す場合は反対側へクランプ
  let labelX = 0;
  let labelY = 0;
  let labelText = "";
  let labelWidth = 0;
  const labelHeight = 22;
  if (shownDot) {
    labelText = `${shownDot.name} (${shownDot.team})  ${xLabel} ${fmt(shownDot.x, xFormat)} / ${yLabel} ${fmt(shownDot.y, yFormat)}`;
    labelWidth = labelText.length * 6.2 + 16; // ponytail: SVGテキスト幅の概算（getBBox計測はしない）
    const dotX = sx(shownDot.x);
    const dotY = sy(shownDot.y);
    labelX = dotX + 10;
    if (labelX + labelWidth > W - PAD.r) labelX = dotX - labelWidth - 10;
    if (labelX < 0) labelX = 2;
    labelY = dotY - 10;
    if (labelY - labelHeight < 0) labelY = dotY + labelHeight + 10;
    if (labelY > H) labelY = H - 4;
  }

  const corners =
    quadrantLabels &&
    ([
      { x: sx(x1) - 6, y: sy(y1) + 12, anchor: "end", text: quadrantLabels[0] },
      { x: sx(x0) + 6, y: sy(y1) + 12, anchor: "start", text: quadrantLabels[1] },
      { x: sx(x1) - 6, y: sy(y0) - 6, anchor: "end", text: quadrantLabels[2] },
      { x: sx(x0) + 6, y: sy(y0) - 6, anchor: "start", text: quadrantLabels[3] },
    ] as const);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[480px]"
        role="img"
        aria-label={`${xLabel}と${yLabel}の散布図（中央値クロス）`}
        onClick={() => setSelected(null)}
      >
        <line x1={sx(xMed)} y1={PAD.t} x2={sx(xMed)} y2={H - PAD.b} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        <line x1={PAD.l} y1={sy(yMed)} x2={W - PAD.r} y2={sy(yMed)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        {corners?.map((q) => (
          <text key={q.text} x={q.x} y={q.y} textAnchor={q.anchor} fontSize={11} fill="currentColor" fillOpacity={0.45}>
            {q.text}
          </text>
        ))}
        {dots.map((d) => (
          <g key={`${d.playerId}-${d.team}`}>
            <circle cx={sx(d.x)} cy={sy(d.y)} r={4} fill={getTeamColor(d.team)} fillOpacity={0.85} />
            {alwaysLabeled.has(d.playerId) && (
              <text
                x={sx(d.x) + (sx(d.x) > midX ? -6 : 6)}
                y={sy(d.y) - 5}
                textAnchor={sx(d.x) > midX ? "end" : "start"}
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.85}
              >
                {d.name}
              </text>
            )}
            {/* タップしやすいよう透明な当たり判定を重ねる */}
            <circle
              cx={sx(d.x)}
              cy={sy(d.y)}
              r={10}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHovered(d.playerId)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelected((prev) => (prev === d.playerId ? null : d.playerId));
              }}
            />
          </g>
        ))}
        {shownDot && (
          <g onClick={(e) => e.stopPropagation()}>
            <rect
              x={labelX}
              y={labelY - labelHeight}
              width={labelWidth}
              height={labelHeight}
              rx={4}
              fill="var(--popover)"
              stroke="currentColor"
              strokeOpacity={0.15}
            />
            <Link href={`/players/${shownDot.playerId}`}>
              <text x={labelX + 8} y={labelY - 7} fontSize={11} fill="var(--popover-foreground)" className="cursor-pointer hover:underline">
                {labelText}
              </text>
            </Link>
          </g>
        )}
        <text x={midX} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.6}>
          {xLabel}→
        </text>
        <text
          x={14}
          y={(PAD.t + H - PAD.b) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          fillOpacity={0.6}
          transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}
        >
          {yLabel}→
        </text>
      </svg>
    </div>
  );
}
