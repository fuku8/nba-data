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

// ノブ背景（pctColor）の相対輝度で文字色を白/黒に切り替える。
// 白文字固定だと黄〜緑帯（pct 0.3〜0.9）でWCAG 4.5:1を割るため（feel-viz 2026-07-16アクセシビリティ点検 A-1の移植）。
// しきい値0.179は白と黒のコントラストが等しくなる輝度＝境界でも両側4.58:1を確保できる値
function knobTextColor(pct: number): string {
  const hue = 220 * (1 - pct);
  const s = 0.65;
  const l = 0.48;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : [0, x, c];
  const lin = (ch: number) => {
    const v = ch + m;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.179 ? "#000" : "#fff";
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
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full flex items-center justify-center text-[13px] font-bold shadow"
                style={{ left: `${pct * 100}%`, backgroundColor: color, color: knobTextColor(pct) }}
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
