"use client";

// 汎用象限マップ: 中央値クロスの散布図。点にホバーで選手名、表示中の点をクリックで個人ページへ遷移。
// タッチはホバーが無いので 1回目のタップで名前を固定表示、2回目（点かラベル）で遷移する。
// ホバー判定は点ごとの enter/leave ではなく SVG 上のポインタ位置から最寄りの点を取る（点→ラベルへ動く途中の隙間で
// 隣の点にホバーが移り、別の選手へ飛ぶのを防ぐ。ラベルの枠内にいる間は保持）
// ブラウザ標準の <title> ツールチップは約1秒静止しないと出ず、タッチでは出ないので使わない
// 点はキーボード操作の対象にしない（150超の点を全部タブ停止にすると逆に操作性が落ちる。数値は同ページの表で読める）

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

// マップを置くカードの説明文（リーダーズ・選手一覧で同じ文言にする）
export const MAP_HELP = "点にホバーで選手名 · 点のクリックで選手ページへ（タッチは1回目のタップで名前、2回目で選手ページ）";
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
  clipTop = 0,
}: {
  dots: QuadrantDot[];
  xLabel: string;
  yLabel: string;
  xFormat?: AxisFormat;
  yFormat?: AxisFormat;
  /** 四隅の説明（右上・左上・右下・左下） */
  quadrantLabels?: [string, string, string, string];
  /** x 上位 N 人と y 上位 N 人に常時名前を出す（両軸のリーダーが端に散るので重なりにくい） */
  labelTop?: number;
  /** y の上位 N 人を上端の余白帯に置き、N+1 番目の値を軸の上限にする。外れ値1人で全体が潰れる図の見栄え用（ホバー値は実値） */
  clipTop?: number;
}) {
  // 識別子は playerId-team（移籍で同一選手が2チーム分の点になり得るため）
  const idOf = (d: QuadrantDot) => `${d.playerId}-${d.team}`;
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);

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
  // clipTop 時は上限を N+1 番目の値で切り、切った点は上端の余白帯に置く。余白は広め（15%）にして通常の点が上端に張り付かないようにする
  // 最大値が同値で並ぶと誰も切られない（totals/GP の実数では実質起きず、起きても軸が伸びるだけなので対処しない）
  const clip = clipTop > 0 && ys.length > clipTop;
  const yTop = clip ? ys[ys.length - 1 - clipTop] : ys[ys.length - 1];
  const y1 = yTop + (clip ? (yTop - ys[0]) * 0.15 : yPad);

  const sx = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - (((v > yTop ? y1 : v) - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const midX = (PAD.l + W - PAD.r) / 2;

  const topBy = (key: "x" | "y") => [...dots].sort((a, b) => b[key] - a[key]).slice(0, labelTop).map(idOf);
  const alwaysLabeled = new Set([...topBy("x"), ...topBy("y")]);
  // 常時ラベルの重なり回避: 下から順に置き、先に置いたラベルと x が重なり y が近ければ 11px ずつ上へ逃がす（上端に届いたら下へ）
  const LABEL_H = 11;
  const placed: { x0: number; x1: number; y: number }[] = [];
  const nameLabels = new Map<string, { x: number; y: number; end: boolean }>();
  for (const d of [...dots].filter((d) => alwaysLabeled.has(idOf(d))).sort((a, b) => sy(b.y) - sy(a.y))) {
    const cx = sx(d.x);
    const end = cx > midX;
    const w = d.name.length * 5.5;
    const x0 = end ? cx - 6 - w : cx + 6;
    const collides = (yy: number) => placed.some((p) => p.x0 < x0 + w && x0 < p.x1 && Math.abs(p.y - yy) < LABEL_H);
    let y = sy(d.y) - 5;
    while (collides(y) && y - LABEL_H >= 10) y -= LABEL_H; // 上へ（文字の上端が viewBox 内に残る範囲で）
    if (collides(y)) {
      y = sy(d.y) + LABEL_H + 4; // 上に余地が無ければ点の下へ
      while (collides(y)) y += LABEL_H;
    }
    placed.push({ x0, x1: x0 + w, y });
    nameLabels.set(idOf(d), { x: end ? cx - 6 : cx + 6, y, end });
  }

  // 固定（クリック）を優先し、無ければホバー中の点
  const shownId = selected ?? hovered;
  const shownDot = shownId != null ? dots.find((d) => idOf(d) === shownId) : undefined;

  // ラベル位置: 点の右横（縦は点と同じ高さ）。右にはみ出すなら左横。縦にはみ出す分はクランプ
  // 点の真横に置くのは、点からラベルへ真っ直ぐ動く経路が「点とラベルを結ぶ矩形」に収まり、途中の別の点に取られないようにするため
  let labelX = 0;
  let labelY = 0;
  let labelText = "";
  let labelWidth = 0;
  const labelHeight = 26; // タップしやすい高さ
  if (shownDot) {
    labelText = `${shownDot.name} (${shownDot.team})  ${xLabel} ${fmt(shownDot.x, xFormat)} / ${yLabel} ${fmt(shownDot.y, yFormat)}`;
    labelWidth = labelText.length * 6.2 + 16; // ponytail: SVGテキスト幅の概算（getBBox計測はしない）
    const dotX = sx(shownDot.x);
    const dotY = sy(shownDot.y);
    labelX = dotX + 12;
    if (labelX + labelWidth > W - PAD.r) labelX = dotX - labelWidth - 12;
    if (labelX < 0) labelX = 2;
    labelY = dotY + labelHeight / 2;
    if (labelY - labelHeight < 0) labelY = labelHeight;
    if (labelY > H) labelY = H;
  }

  // 当たり判定は点ごとの要素ではなく SVG 全体で受け、ポインタ位置から最寄りの点（HIT_R 以内）を選ぶ
  // （常時表示の名前テキストが点に被ってもクリックが届く。タッチもタップ位置で同じ判定）
  const HIT_R = 10;
  const toViewBox = (e: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    // 画面座標 → viewBox 座標（SVG の余白・レターボックスも CTM が吸収する）
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  };
  const nearest = (px: number, py: number) => {
    let best: QuadrantDot | null = null;
    let bestD = HIT_R;
    for (const d of dots) {
      const dist = Math.hypot(sx(d.x) - px, sy(d.y) - py);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  };
  // マウス移動: 表示中の点とラベルを結ぶ矩形の中なら保持、それ以外は最寄りの点
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = e.pointerType === "mouse" ? toViewBox(e) : null;
    if (!pt) return;
    if (shownDot) {
      const dx = sx(shownDot.x);
      const dy = sy(shownDot.y);
      const inCorridor =
        pt.x >= Math.min(labelX, dx) && pt.x <= Math.max(labelX + labelWidth, dx) && pt.y >= Math.min(labelY - labelHeight, dy) && pt.y <= Math.max(labelY, dy);
      if (inCorridor) return;
    }
    const d = nearest(pt.x, pt.y);
    setHovered(d ? idOf(d) : null);
  };
  // クリック/タップ: 表示中の点なら個人ページへ、別の点なら固定表示、点が無ければ解除
  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const pt = toViewBox(e);
    const d = pt ? nearest(pt.x, pt.y) : null;
    if (!d) setSelected(null);
    else if (shownId === idOf(d)) router.push(`/players/${d.playerId}`);
    else setSelected(idOf(d));
  };

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
        className={`w-full min-w-[480px] ${hovered ? "cursor-pointer" : ""}`}
        role="img"
        aria-label={`${xLabel}と${yLabel}の散布図（中央値クロス）`}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
        ref={svgRef}
      >
        <line x1={sx(xMed)} y1={PAD.t} x2={sx(xMed)} y2={H - PAD.b} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        <line x1={PAD.l} y1={sy(yMed)} x2={W - PAD.r} y2={sy(yMed)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        {corners?.map((q) => (
          <text key={q.text} x={q.x} y={q.y} textAnchor={q.anchor} fontSize={11} fill="currentColor" fillOpacity={0.45}>
            {q.text}
          </text>
        ))}
        {dots.map((d) => (
          <g key={idOf(d)}>
            <circle cx={sx(d.x)} cy={sy(d.y)} r={4} fill={getTeamColor(d.team)} fillOpacity={0.85} />
            {nameLabels.has(idOf(d)) && (
              <text
                x={nameLabels.get(idOf(d))!.x}
                y={nameLabels.get(idOf(d))!.y}
                textAnchor={nameLabels.get(idOf(d))!.end ? "end" : "start"}
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.85}
              >
                {d.name}
              </text>
            )}
          </g>
        ))}
        {shownDot && (
          /* ラベル全体がリンク（枠内にポインタがある間は onPointerMove が保持する） */
          <Link
            href={`/players/${shownDot.playerId}`}
            className="cursor-pointer [&_text]:hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
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
            <text x={labelX + 8} y={labelY - labelHeight / 2 + 4} fontSize={11} fill="var(--popover-foreground)">
              {labelText}
            </text>
          </Link>
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
