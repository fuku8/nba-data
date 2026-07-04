// 5部門パーセンタイルのレーダーチャート＋オールラウンド度（平均×均等さ）
// サーバーコンポーネント・純SVG

export interface RadarItem {
  label: string;
  pct: number; // 0-1
}

// オールラウンド度 = 平均 × (1 − 標準偏差)。高水準かつ均等なほど高い（0-1）
export function versatilityScore(pcts: number[]): number {
  const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const sd = Math.sqrt(pcts.reduce((a, p) => a + (p - mean) ** 2, 0) / pcts.length);
  return mean * (1 - sd);
}

const C = 110; // 中心
const R = 78; // 最大半径

function pt(i: number, n: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

export function VersatilityRadar({ items }: { items: RadarItem[] }) {
  const n = items.length;
  const ring = (frac: number) => items.map((_, i) => pt(i, n, R * frac).join(",")).join(" ");
  const shape = items.map((it, i) => pt(i, n, R * Math.max(0.02, it.pct)).join(",")).join(" ");

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[260px]" role="img" aria-label="5部門パーセンタイルのレーダーチャート">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="currentColor" strokeOpacity={0.15} />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, n, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.15} />;
      })}
      <polygon points={shape} fill="#f97316" fillOpacity={0.35} stroke="#f97316" strokeWidth={1.5} />
      {items.map((it, i) => {
        const [x, y] = pt(i, n, R + 18);
        return (
          <text key={it.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="currentColor">
            {it.label}
          </text>
        );
      })}
      {items.map((it, i) => {
        const [x, y] = pt(i, n, R * Math.max(0.02, it.pct));
        return <circle key={it.label} cx={x} cy={y} r={2.5} fill="#f97316" />;
      })}
    </svg>
  );
}
