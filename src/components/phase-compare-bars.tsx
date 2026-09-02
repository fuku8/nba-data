import type { PercentileRow } from "@/components/percentile-bars";

// RS と PO のパーセンタイルを項目ごとに2本並べる（上=RS 灰、下=PO 橙）。色は位置ではなくフェーズを表す
export const RS_COLOR = "#94a3b8";
export const PO_COLOR = "#f97316";

export function PhaseCompareBars({ rs, po }: { rs: PercentileRow[]; po: PercentileRow[] }) {
  const poByLabel = new Map(po.map((r) => [r.label, r]));
  const bar = (row: PercentileRow, color: string, tag: string) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 shrink-0 font-semibold" style={{ color }}>{tag}</span>
      <div className="relative flex-1 h-1.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${row.pct * 100}%`, backgroundColor: color, opacity: 0.6 }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold text-black"
          style={{ left: `${row.pct * 100}%`, backgroundColor: color }}
        >
          {Math.round(row.pct * 100)}
        </div>
      </div>
      <span className="w-14 shrink-0 text-right font-mono">{row.display}</span>
    </div>
  );
  return (
    <div className="space-y-3">
      {rs.map((r) => {
        const p = poByLabel.get(r.label);
        if (!p) return null;
        return (
          <div key={r.label} className="flex items-start gap-3 text-sm">
            <div className="w-28 shrink-0 pt-0.5 text-muted-foreground">{r.label}</div>
            <div className="flex-1 space-y-1">
              {bar(r, RS_COLOR, "RS")}
              {bar(p, PO_COLOR, "PO")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
