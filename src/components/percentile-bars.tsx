// リーグ内パーセンタイルを色温度つきバーで表示する（Baseball Savant式）
// サーバーコンポーネント。母集団の抽出とパーセンタイル計算もここで行う

export interface PercentileRow {
  label: string;
  display: string;
  pct: number; // 0-1。高いほど良い方向に正規化済みであること
}

// mid-rankパーセンタイル: (v未満の数 + 同値の半分) / 全体（0-1）
// 反転（1 - pct）しても同値タイの扱いが対称になる
export function percentileOf(values: number[], v: number): number {
  if (values.length === 0) return 0;
  let below = 0;
  let tied = 0;
  for (const x of values) {
    if (x < v) below++;
    else if (x === v) tied++;
  }
  return (below + tied / 2) / values.length;
}

// 青(低) → 赤(高) の色温度
function pctColor(pct: number): string {
  const hue = 220 * (1 - pct);
  return `hsl(${hue}, 65%, 48%)`;
}

export function PercentileBars({ rows }: { rows: PercentileRow[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map(({ label, display, pct }) => {
        const p100 = Math.round(pct * 100);
        const color = pctColor(pct);
        return (
          <div key={label} className="flex items-center gap-3 text-sm">
            <div className="w-28 shrink-0 text-muted-foreground">{label}</div>
            <div className="relative flex-1 h-2 rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pct * 100}%`, backgroundColor: color, opacity: 0.45 }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
                style={{ left: `${pct * 100}%`, backgroundColor: color }}
              >
                {p100}
              </div>
            </div>
            <div className="w-14 shrink-0 text-right font-mono font-semibold">{display}</div>
          </div>
        );
      })}
    </div>
  );
}
