// USG%×TS% 四象限マップ: 攻撃の負荷と効率の散布図（交点は中央値）
// サーバーコンポーネント・純SVG

import { getTeamColor } from "@/lib/constants/teams";

export interface UsageDot {
  name: string;
  team: string;
  usg: number; // 0-1
  ts: number; // 0-1
}

const W = 680;
const H = 440;
const PAD = { l: 46, r: 16, t: 24, b: 40 };

export function UsageEfficiencyMap({ dots, labelCount = 8 }: { dots: UsageDot[]; labelCount?: number }) {
  if (dots.length === 0) return null;
  const usgs = dots.map((d) => d.usg).sort((a, b) => a - b);
  const tss = dots.map((d) => d.ts).sort((a, b) => a - b);
  const med = (xs: number[]) => xs[Math.floor(xs.length / 2)];
  const usgMed = med(usgs);
  const tsMed = med(tss);
  const pad = 0.01;
  const x0 = usgs[0] - pad, x1 = usgs[usgs.length - 1] + pad;
  const y0 = tss[0] - pad, y1 = tss[tss.length - 1] + pad;
  const sx = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);

  // USG上位に名前ラベル（重なり回避はしない素朴版）
  const labeled = new Set(
    [...dots].sort((a, b) => b.usg - a.usg).slice(0, labelCount).map((d) => d.name)
  );

  const quad = [
    { x: sx(x1) - 6, y: sy(y1) + 12, anchor: "end", text: "重労働 × 高効率" },
    { x: sx(x0) + 6, y: sy(y1) + 12, anchor: "start", text: "省エネ × 高効率" },
    { x: sx(x1) - 6, y: sy(y0) - 6, anchor: "end", text: "重労働 × 低効率" },
    { x: sx(x0) + 6, y: sy(y0) - 6, anchor: "start", text: "省エネ × 低効率" },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="USG%とTS%の散布図">
        <line x1={sx(usgMed)} y1={PAD.t} x2={sx(usgMed)} y2={H - PAD.b} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        <line x1={PAD.l} y1={sy(tsMed)} x2={W - PAD.r} y2={sy(tsMed)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 3" />
        {quad.map((q) => (
          <text key={q.text} x={q.x} y={q.y} textAnchor={q.anchor} fontSize={11} fill="currentColor" fillOpacity={0.45}>
            {q.text}
          </text>
        ))}
        {dots.map((d) => (
          <g key={`${d.name}-${d.team}`}>
            <circle cx={sx(d.usg)} cy={sy(d.ts)} r={4} fill={getTeamColor(d.team)} fillOpacity={0.85}>
              <title>{`${d.name} (${d.team})  USG ${(d.usg * 100).toFixed(1)}% / TS ${(d.ts * 100).toFixed(1)}%`}</title>
            </circle>
            {labeled.has(d.name) && (
              <text x={sx(d.usg) + 6} y={sy(d.ts) - 5} fontSize={10} fill="currentColor" fillOpacity={0.85}>
                {d.name}
              </text>
            )}
          </g>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.6}>
          USG%（攻撃をどれだけ背負うか）→
        </text>
        <text x={14} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.6} transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}>
          TS%（得点効率）→
        </text>
      </svg>
    </div>
  );
}
