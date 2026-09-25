"use client";

// トップページのヒーロー「強さの地形」「スタイルの地形」（plan.md §13-3 2026-09-24決定・同日改訂）
// 30チームの四象限散布図。PCは2図並列（players のマップ2枚と同じ型）、スマホはトグル切替の1枚。
// - 造語は使わない: 軸ラベルは流通用語の併記形のみ・象限ラベルなし（メモリ no-coined-terms-for-nba-vocab）
// - タップ1回目=点の近くにポップアップ・2回目=チームページへ（QuadrantMap と同じ操作系。図の外に出すと気づかれない）
// - 重なる点は最小間隔まで反発させて離す（データ位置の僅かなずれを許容。説明文に明記）
// - draw-in は初回1回だけ（§13-3 アニメ方針: トップで動くのは1箇所。prefers-reduced-motion では動かない）
// - highlight=チーム略称 でチームページ用: 他チームを40%に落とし、当該チームは点・文字を1.35倍＋レーティング数値を常時表示（2026-09-25指示）

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartFrame } from "@/components/chart-frame";
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

// sub=タイトル下の1行（軸名のみ）、desc=図の下の説明（スマホのファーストビューで図を隠さない配置。2026-09-24指示）
const AXES = {
  strength: {
    name: "強さの地形",
    sub: "OFレーティング × DFレーティング",
    desc: "右上ほど攻守とも上位。点線は30チームの中央値・重なる点は見やすさのため僅かに離しています。点をタップすると成績・もう一度タップでチームページへ。",
    x: (t: TerrainTeam) => t.ortg,
    y: (t: TerrainTeam) => t.drtg,
    yInvert: true, // DRtg は小さいほど上
    xLabel: "攻撃レーティング (ORtg) →",
    yLabel: "守備レーティング (DRtg)・上ほど失点が少ない",
  },
  style: {
    name: "スタイルの地形",
    sub: "ペース × OFレーティング",
    desc: "右上ほど速くて効率的（ペース=48分あたりの推定ポゼッション数）。点線は30チームの中央値・重なる点は見やすさのため僅かに離しています。点をタップすると成績・もう一度タップでチームページへ。",
    x: (t: TerrainTeam) => t.pace,
    y: (t: TerrainTeam) => t.ortg,
    yInvert: false,
    xLabel: "ペース (PACE) →",
    yLabel: "攻撃レーティング (ORtg) →",
  },
} as const;

// PC並列は正方形寄り・スマホ1枚は縦長（同じpx幅に縮めても文字が読める viewBox）
// pair の viewBox はカード実幅約745pxに対する縮尺で点・文字が大きくなりすぎない値（2026-09-24調整）
const DIMS = {
  pair:   { W: 640, H: 520, PAD: { l: 44, r: 48, t: 28, b: 40 }, font: 12.5, dotR: 6.5, axisFont: 12.5 },
  narrow: { W: 520, H: 640, PAD: { l: 40, r: 44, t: 28, b: 40 }, font: 13, dotR: 7, axisFont: 13 },
} as const;
type Dims = (typeof DIMS)[keyof typeof DIMS];
const HI = 1.35; // 強調チームの点・文字の倍率

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
function labelLayout(pts: { x: number; y: number }[], D: Dims, hi: number): LabelPos[] {
  const rOf = (i: number) => D.dotR * (i === hi ? HI : 1);
  const placed = pts.map(({ x, y }, i) => ({ x: x - rOf(i), y: y - rOf(i), w: rOf(i) * 2, h: rOf(i) * 2 }));
  const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
    placed.some((p) => b.x < p.x + p.w && p.x < b.x + b.w && b.y < p.y + p.h && p.y < b.y + b.h);
  return pts.map(({ x, y }, i) => {
    const fs = D.font * (i === hi ? HI : 1), r = rOf(i), boxW = 9 + 3 * fs * 0.68, boxH = fs + 3;
    const cands: (LabelPos & { box: { x: number; y: number; w: number; h: number } })[] = [
      { dx: r + 3.5, dy: fs * 0.35, anchor: "start",  box: { x: x + r + 3.5, y: y - boxH / 2, w: boxW, h: boxH } },
      { dx: -(r + 3.5), dy: fs * 0.35, anchor: "end", box: { x: x - r - 3.5 - boxW, y: y - boxH / 2, w: boxW, h: boxH } },
      { dx: 0, dy: r + fs, anchor: "middle",          box: { x: x - boxW / 2, y: y + r + 2, w: boxW, h: boxH } },
      { dx: 0, dy: -(r + 4), anchor: "middle",        box: { x: x - boxW / 2, y: y - r - 2 - boxH, w: boxW, h: boxH } },
    ];
    const pick = cands.find((c) => !overlaps(c.box)) ?? cands[0];
    placed.push(pick.box);
    return { dx: pick.dx, dy: pick.dy, anchor: pick.anchor };
  });
}

function layout(teams: TerrainTeam[], axis: AxisKey, D: Dims, hi: number) {
  const ax = AXES[axis];
  const xs = teams.map(ax.x), ys = teams.map(ax.y);
  const sx = makeScale(xs, D.PAD.l, D.W - D.PAD.r);
  const sy = ax.yInvert
    ? makeScale(ys, D.PAD.t, D.H - D.PAD.b)   // 値が小さいほど上
    : makeScale(ys, D.H - D.PAD.b, D.PAD.t);  // 値が大きいほど上
  const pts = teams.map((t) => ({ x: sx(ax.x(t)), y: sy(ax.y(t)) }));
  separate(pts, D);
  return { pts, labels: labelLayout(pts, D, hi), mx: sx(median(xs)), my: sy(median(ys)) };
}

// 全角=fs・半角=0.55fs でテキスト幅を見積もる（ポップアップの箱サイズ用）
const textW = (s: string, fs: number) =>
  [...s].reduce((w, c) => w + ((c.codePointAt(0) ?? 0) > 0xff ? fs : fs * 0.55), 0);

function TerrainMap({ teams, axis, dims: D, highlight }: { teams: TerrainTeam[]; axis: AxisKey; dims: Dims; highlight?: string }) {
  const router = useRouter();
  const hi = highlight ? teams.findIndex((t) => t.abbr === highlight) : -1;
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

  const { pts, labels, mx, my } = useMemo(() => layout(teams, axis, D, hi), [teams, axis, D, hi]);

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

  // 強調チームのレーティング箱: 上・下・右・左の候補から他チームの点を覆う数が最少の位置を選ぶ（Codexレビュー指摘）。
  // 当該チーム自身のポップアップ（同じ数値を含む）を開いている間だけ隠す
  const badge = (() => {
    if (hi < 0 || selected === hi || !pts[hi]) return null;
    const t = teams[hi], p = pts[hi], fs = D.font + 1, r = D.dotR * HI;
    const text = `ORtg ${t.ortg.toFixed(1)} / DRtg ${t.drtg.toFixed(1)} / PACE ${t.pace.toFixed(1)}`;
    const w = textW(text, fs) * 0.92 + 16, h = fs + 12;
    const clampX = (x: number) => Math.min(Math.max(x, 4), D.W - w - 4);
    const clampY = (y: number) => Math.min(Math.max(y, 4), D.H - h - 4);
    const cands = [
      { bx: clampX(p.x - w / 2), by: clampY(p.y - r - 6 - h) },
      { bx: clampX(p.x - w / 2), by: clampY(p.y + r + 6) },
      { bx: clampX(p.x + r + 6), by: clampY(p.y - h / 2) },
      { bx: clampX(p.x - r - 6 - w), by: clampY(p.y - h / 2) },
    ];
    // 自分の点・略号を覆う候補は失格扱い（画面端でずらされた箱が自分を隠した事例: 2026-09-25 スマホ幅 HOU）
    const hit = (c: { bx: number; by: number }, x: number, y: number, hw: number, hh: number) =>
      x + hw > c.bx && x - hw < c.bx + w && y + hh > c.by && y - hh < c.by + h;
    const lf = D.font * HI, lw = 9 + 3 * lf * 0.68, lb = labels[hi];
    const lx = p.x + lb.dx + (lb.anchor === "start" ? lw / 2 : lb.anchor === "end" ? -lw / 2 : 0), ly = p.y + lb.dy - lf * 0.35;
    const covered = (c: { bx: number; by: number }) =>
      pts.filter((q, i) => i !== hi && hit(c, q.x, q.y, D.dotR, D.dotR)).length
      + (hit(c, p.x, p.y, r, r) || hit(c, lx, ly, lw / 2, (lf + 3) / 2) ? 100 : 0);
    const { bx, by } = cands.reduce((best, c) => (covered(c) < covered(best) ? c : best));
    return { t, text, bx, by, w, h, fs };
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
            opacity: anim === "start" ? 0 : hi >= 0 && i !== hi ? 0.4 : 1,
            transition: anim === "start" ? "none" : "transform .75s cubic-bezier(.22,.9,.3,1), opacity .4s",
            transitionDelay: anim === "run" ? `${i * 12}ms` : "0ms",
            cursor: "pointer",
          }}
          onClick={(e) => { e.stopPropagation(); tapDot(i); }}
        >
          <circle r={D.dotR * (i === hi ? HI : 1)} fill={t.color} />
          <text x={labels[i].dx} y={labels[i].dy} textAnchor={labels[i].anchor} fontSize={D.font * (i === hi ? HI : 1)} fontWeight={i === hi ? 800 : 600} fill={t.color}>
            {t.abbr}
          </text>
        </g>
      ))}
      {badge && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={badge.bx} y={badge.by} width={badge.w} height={badge.h} rx={6} fill="var(--popover)" stroke={badge.t.color} strokeWidth={1} />
          <text x={badge.bx + badge.w / 2} y={badge.by + badge.h / 2 + badge.fs * 0.35} textAnchor="middle" fontSize={badge.fs} fontWeight={600} fill="var(--popover-foreground)">{badge.text}</text>
        </g>
      )}
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

export function LeagueTerrain({ teams, context, asOf, highlight }: { teams: TerrainTeam[]; context: string; asOf?: string; highlight?: string }) {
  // スマホ1枚のトグル用（PC並列側は両方常設なので使わない）
  const [axis, setAxis] = useState<AxisKey>("strength");
  // チームページ用: 保存画像のヘッダーにチーム名・略称バッジを出す
  const hiTeam = highlight ? teams.find((t) => t.abbr === highlight) : undefined;

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
              <CardDescription>{AXES[k].sub}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartFrame title={AXES[k].name} context={context} asOf={asOf} name={hiTeam?.nameJa} team={hiTeam?.abbr}>
                <TerrainMap teams={teams} axis={k} dims={DIMS.pair} highlight={highlight} />
              </ChartFrame>
              <p className="mt-2 text-sm text-muted-foreground">{AXES[k].desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* スマホ: 1枚表示。タイトル=表示中の図、右端はもう一方への切り替え誘導だけ
          （タイトルとタブに同じ名称が並ぶ違和感と、タブ位置が折り返しでぶれる問題への対応。2026-09-24） */}
      <Card className="lg:hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 flex-nowrap">
            <span className="flex items-center gap-2 whitespace-nowrap">
              {AXES[axis].name}
              <MetricLink anchor="league-terrain" />
            </span>
            <button
              type="button"
              onClick={() => setAxis(axis === "strength" ? "style" : "strength")}
              aria-label={`${AXES[axis === "strength" ? "style" : "strength"].name}に切り替え`}
              className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-normal text-muted-foreground hover:bg-accent transition-colors whitespace-nowrap"
            >
              {AXES[axis === "strength" ? "style" : "strength"].name} →
            </button>
          </CardTitle>
          <CardDescription>{AXES[axis].sub}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartFrame title={AXES[axis].name} context={context} asOf={asOf} name={hiTeam?.nameJa} team={hiTeam?.abbr}>
            <TerrainMap teams={teams} axis={axis} dims={DIMS.narrow} highlight={highlight} />
          </ChartFrame>
          <p className="mt-2 text-sm text-muted-foreground">{AXES[axis].desc}</p>
        </CardContent>
      </Card>
    </>
  );
}
