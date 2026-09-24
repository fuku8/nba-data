"use client";

// トップページのヒーロー「強さの地形」「スタイルの地形」（plan.md §13-3 2026-09-24決定・同日改訂）
// 30チームの四象限散布図。PCは2図並列（players のマップ2枚と同じ型）、スマホはトグル切替の1枚。
// - 造語は使わない: 軸ラベルは流通用語の併記形のみ・象限ラベルなし（メモリ no-coined-terms-for-nba-vocab）
// - タップ1回目=点の近くにポップアップ・2回目=チームページへ（QuadrantMap と同じ操作系。図の外に出すと気づかれない）
// - 重なる点は最小間隔まで反発させて離す（データ位置の僅かなずれを許容。説明文に明記）
// - draw-in は初回1回だけ（§13-3 アニメ方針: トップで動くのは1箇所。prefers-reduced-motion では動かない）

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MetricLink } from "@/components/metric-link";

export interface TerrainTeam {
  abbr: string;
  nameJa: string;
  color: string;
  ortg: number;
  drtg: number;
  pace: number;
  wins: number;
  losses: number;
}

type AxisKey = "strength" | "style";

const AXES = {
  strength: {
    name: "強さの地形",
    desc: "攻撃レーティング (ORtg) × 守備レーティング (DRtg・上ほど失点が少ない)。右上ほど攻守とも上位。点線は30チームの中央値・重なる点は見やすさのため僅かに離しています。点をタップすると成績・もう一度タップでチームページへ。",
    x: (t: TerrainTeam) => t.ortg,
    y: (t: TerrainTeam) => t.drtg,
    yInvert: true, // DRtg は小さいほど上
    xLabel: "攻撃レーティング (ORtg) →",
    yLabel: "守備レーティング (DRtg)・上ほど失点が少ない",
  },
  style: {
    name: "スタイルの地形",
    desc: "ペース (PACE・推定ポゼッション/48min) × 攻撃レーティング (ORtg)。右上ほど速くて効率的。点線は30チームの中央値・重なる点は見やすさのため僅かに離しています。点をタップすると成績・もう一度タップでチームページへ。",
    x: (t: TerrainTeam) => t.pace,
    y: (t: TerrainTeam) => t.ortg,
    yInvert: false,
    xLabel: "ペース (PACE) →",
    yLabel: "攻撃レーティング (ORtg) →",
  },
} as const;

// PC並列は正方形寄り・スマホ1枚は縦長（同じpx幅に縮めても文字が読める viewBox）
const DIMS = {
  pair:   { W: 520, H: 500, PAD: { l: 40, r: 44, t: 28, b: 40 }, font: 13, dotR: 7, axisFont: 13 },
  narrow: { W: 520, H: 640, PAD: { l: 40, r: 44, t: 28, b: 40 }, font: 13, dotR: 7, axisFont: 13 },
} as const;
type Dims = (typeof DIMS)[keyof typeof DIMS];

const median = (arr: number[]) => {
  const s = [...arr].sort((a, b) => a - b);
  return (s[s.length >> 1] + s[(s.length - 1) >> 1]) / 2;
};

function makeScale(vals: number[], outMin: number, outMax: number) {
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.08;
  const a = lo - pad, b = hi + pad;
  // 全値一致（シーズン極序盤など）は 0/0 で NaN になるため中央に置く（Codexレビュー a282ee9 指摘）
  if (b - a === 0) return () => (outMin + outMax) / 2;
  return (v: number) => outMin + (outMax - outMin) * ((v - a) / (b - a));
}

// 点同士の重なり回避: 最小間隔未満のペアを反発させる。決定論的（同じデータなら同じ配置）
function separate(pts: { x: number; y: number }[], D: Dims) {
  const minD = D.dotR * 2 + 7;
  for (let it = 0; it < 80; it++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d >= minD) continue;
      if (d < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; } // 完全一致は角度を決め打ち
      const push = (minD - d) / 2 / d;
      a.x -= dx * push; a.y -= dy * push;
      b.x += dx * push; b.y += dy * push;
      moved = true;
    }
    for (const p of pts) {
      p.x = Math.min(Math.max(p.x, D.PAD.l), D.W - D.PAD.r);
      p.y = Math.min(Math.max(p.y, D.PAD.t), D.H - D.PAD.b);
    }
    if (!moved) break;
  }
}

interface LabelPos { dx: number; dy: number; anchor: "start" | "end" | "middle" }

// ラベル配置: 右→左→下→上の順に、点とラベルのどちらにも重ならない位置を選ぶ
function labelLayout(pts: { x: number; y: number }[], D: Dims): LabelPos[] {
  const fs = D.font, boxW = 9 + 3 * fs * 0.68, boxH = fs + 3;
  const placed = pts.map(({ x, y }) => ({ x: x - D.dotR, y: y - D.dotR, w: D.dotR * 2, h: D.dotR * 2 }));
  const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
    placed.some((p) => b.x < p.x + p.w && p.x < b.x + b.w && b.y < p.y + p.h && p.y < b.y + b.h);
  return pts.map(({ x, y }) => {
    const cands: (LabelPos & { box: { x: number; y: number; w: number; h: number } })[] = [
      { dx: D.dotR + 3.5, dy: fs * 0.35, anchor: "start",  box: { x: x + D.dotR + 3.5, y: y - boxH / 2, w: boxW, h: boxH } },
      { dx: -(D.dotR + 3.5), dy: fs * 0.35, anchor: "end", box: { x: x - D.dotR - 3.5 - boxW, y: y - boxH / 2, w: boxW, h: boxH } },
      { dx: 0, dy: D.dotR + fs, anchor: "middle",          box: { x: x - boxW / 2, y: y + D.dotR + 2, w: boxW, h: boxH } },
      { dx: 0, dy: -(D.dotR + 4), anchor: "middle",        box: { x: x - boxW / 2, y: y - D.dotR - 2 - boxH, w: boxW, h: boxH } },
    ];
    const pick = cands.find((c) => !overlaps(c.box)) ?? cands[0];
    placed.push(pick.box);
    return { dx: pick.dx, dy: pick.dy, anchor: pick.anchor };
  });
}

function layout(teams: TerrainTeam[], axis: AxisKey, D: Dims) {
  const ax = AXES[axis];
  const xs = teams.map(ax.x), ys = teams.map(ax.y);
  const sx = makeScale(xs, D.PAD.l, D.W - D.PAD.r);
  const sy = ax.yInvert
    ? makeScale(ys, D.PAD.t, D.H - D.PAD.b)   // 値が小さいほど上
    : makeScale(ys, D.H - D.PAD.b, D.PAD.t);  // 値が大きいほど上
  const pts = teams.map((t) => ({ x: sx(ax.x(t)), y: sy(ax.y(t)) }));
  separate(pts, D);
  return { pts, labels: labelLayout(pts, D), mx: sx(median(xs)), my: sy(median(ys)) };
}

// 全角=fs・半角=0.55fs でテキスト幅を見積もる（ポップアップの箱サイズ用）
const textW = (s: string, fs: number) =>
  [...s].reduce((w, c) => w + ((c.codePointAt(0) ?? 0) > 0xff ? fs : fs * 0.55), 0);

function TerrainMap({ teams, axis, dims: D }: { teams: TerrainTeam[]; axis: AxisKey; dims: Dims }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  // draw-in: SSR/初回描画は定位置（JS無しでも図が完成している）。マウント後に一度だけ下端から描き上げる
  const [anim, setAnim] = useState<"idle" | "start" | "run">("idle");
  const drewRef = useRef(false);

  // 軸が切り替わったらポップアップを閉じる（レンダー中のstate調整パターン。effect内のsetStateはlint対象）
  const [prevAxis, setPrevAxis] = useState<AxisKey>(axis);
  if (axis !== prevAxis) {
    setPrevAxis(axis);
    setSelected(null);
  }

  const { pts, labels, mx, my } = useMemo(() => layout(teams, axis, D), [teams, axis, D]);

  useEffect(() => {
    if (drewRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    drewRef.current = true;
    // 「start」（下端・透明・transitionなし）を一度描画してから「run」で定位置へ滑らせる
    let raf1 = 0, raf2 = 0;
    const raf0 = requestAnimationFrame(() => {
      setAnim("start");
      raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setAnim("run")); });
    });
    const done = setTimeout(() => setAnim("idle"), 1700);
    return () => { cancelAnimationFrame(raf0); cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(done); };
  }, []);

  const tapDot = (i: number) => {
    if (selected === i) {
      router.push(`/teams/${teams[i].abbr}`);
      return;
    }
    setSelected(i);
  };

  // ポップアップ（点の近く・右にはみ出すなら左横・両端は画面内にクランプ）
  const tip = (() => {
    if (selected === null || !pts[selected]) return null;
    const t = teams[selected], p = pts[selected];
    const fs = D.font + 1.5, lh = fs + 5;
    const line1 = `${t.nameJa}　${t.wins}勝${t.losses}敗`;
    const line2 = `ORtg ${t.ortg.toFixed(1)} / DRtg ${t.drtg.toFixed(1)} / PACE ${t.pace.toFixed(1)}`;
    const w = Math.max(textW(line1, fs), textW(line2, fs) * 0.92) + 20;
    const h = lh * 2 + 12;
    let bx = p.x + D.dotR + 8;
    if (bx + w > D.W - 4) bx = p.x - D.dotR - 8 - w;
    bx = Math.min(Math.max(bx, 4), D.W - w - 4);
    const by = Math.min(Math.max(p.y - h / 2, 4), D.H - h - 4);
    return { t, line1, line2, bx, by, w, h, fs, lh };
  })();

  const ax = AXES[axis];
  const dotTransform = (i: number) =>
    anim === "start"
      ? `translate(${D.W / 2}px, ${D.H - D.PAD.b}px)`
      : `translate(${pts[i].x}px, ${pts[i].y}px)`;

  return (
    <svg
      viewBox={`0 0 ${D.W} ${D.H}`}
      className="w-full"
      role="img"
      aria-label={`${ax.name}（30チームの散布図）`}
      onClick={() => setSelected(null)}
    >
      <line x1={mx} y1={D.PAD.t - 6} x2={mx} y2={D.H - D.PAD.b + 6} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
      <line x1={D.PAD.l - 6} y1={my} x2={D.W - D.PAD.r + 6} y2={my} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
      {/* 横軸=下辺中央、縦軸=左辺に沿わせて回転（QuadrantMap と同じ流儀）。DRtg は向きが逆なので矢印でなく言葉で示す */}
      <text x={(D.PAD.l + D.W - D.PAD.r) / 2} y={D.H - 8} textAnchor="middle" fontSize={D.axisFont} fill="currentColor" fillOpacity={0.6}>{ax.xLabel}</text>
      <text
        x={14}
        y={(D.PAD.t + D.H - D.PAD.b) / 2}
        textAnchor="middle"
        fontSize={D.axisFont}
        fill="currentColor"
        fillOpacity={0.6}
        transform={`rotate(-90 14 ${(D.PAD.t + D.H - D.PAD.b) / 2})`}
      >
        {ax.yLabel}
      </text>
      {teams.map((t, i) => (
        <g
          key={t.abbr}
          style={{
            transform: dotTransform(i),
            opacity: anim === "start" ? 0 : 1,
            transition: anim === "start" ? "none" : "transform .75s cubic-bezier(.22,.9,.3,1), opacity .4s",
            transitionDelay: anim === "run" ? `${i * 12}ms` : "0ms",
            cursor: "pointer",
          }}
          onClick={(e) => { e.stopPropagation(); tapDot(i); }}
        >
          <circle r={D.dotR} fill={t.color} />
          <text x={labels[i].dx} y={labels[i].dy} textAnchor={labels[i].anchor} fontSize={D.font} fontWeight={600} fill={t.color}>
            {t.abbr}
          </text>
        </g>
      ))}
      {tip && (
        <g onClick={(e) => { e.stopPropagation(); router.push(`/teams/${tip.t.abbr}`); }} style={{ cursor: "pointer" }}>
          <rect x={tip.bx} y={tip.by} width={tip.w} height={tip.h} rx={6} fill="var(--popover)" stroke={tip.t.color} strokeWidth={1} />
          <text x={tip.bx + 10} y={tip.by + tip.lh} fontSize={tip.fs} fontWeight={700} fill="var(--popover-foreground)">{tip.line1}</text>
          <text x={tip.bx + 10} y={tip.by + tip.lh * 2 + 2} fontSize={tip.fs - 1.5} fill="currentColor" fillOpacity={0.65}>{tip.line2}</text>
        </g>
      )}
    </svg>
  );
}

export function LeagueTerrain({ teams }: { teams: TerrainTeam[] }) {
  // スマホ1枚のトグル用（PC並列側は両方常設なので使わない）
  const [axis, setAxis] = useState<AxisKey>("strength");

  return (
    <>
      {/* PC: 2図並列（players のマップ2枚と同じ型） */}
      <div className="hidden lg:grid gap-4 grid-cols-2">
        {(["strength", "style"] as const).map((k) => (
          <Card key={k}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {AXES[k].name}
                <MetricLink anchor="league-terrain" />
              </CardTitle>
              <CardDescription>{AXES[k].desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <TerrainMap teams={teams} axis={k} dims={DIMS.pair} />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* スマホ: トグル切替の1枚 */}
      <Card className="lg:hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              {AXES[axis].name}
              <MetricLink anchor="league-terrain" />
            </span>
            <span className="inline-flex rounded-md border overflow-hidden" role="group" aria-label="地形図の切り替え">
              {(["strength", "style"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={axis === k}
                  onClick={() => setAxis(k)}
                  className={`px-3 py-1.5 text-sm font-normal ${axis === k ? "bg-accent font-semibold" : "text-muted-foreground"}`}
                >
                  {AXES[k].name}
                </button>
              ))}
            </span>
          </CardTitle>
          <CardDescription>{AXES[axis].desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <TerrainMap teams={teams} axis={axis} dims={DIMS.narrow} />
        </CardContent>
      </Card>
    </>
  );
}
