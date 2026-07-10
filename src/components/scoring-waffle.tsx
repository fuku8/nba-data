// 得点構成ワッフル: 100マスで「得点の作り方」（3P/2P/FT）を表示
// サーバーコンポーネント・CSS gridのみ

const PARTS = [
  { key: "pts3", label: "3P", color: "#8b5cf6" },
  { key: "pts2", label: "2P", color: "#0ea5e9" },
  { key: "ptsFt", label: "FT", color: "#f59e0b" },
] as const;

export function ScoringWaffle({ pts3, pts2, ptsFt }: { pts3: number; pts2: number; ptsFt: number }) {
  const total = pts3 + pts2 + ptsFt;
  if (total <= 0) return null;
  const values = { pts3, pts2, ptsFt };
  // 四捨五入で合計100にならない分は最大パートで調整
  const counts = PARTS.map((p) => Math.round((values[p.key] / total) * 100));
  const diff = 100 - counts.reduce((a, b) => a + b, 0);
  counts[counts.indexOf(Math.max(...counts))] += diff;

  const cells: string[] = [];
  PARTS.forEach((p, i) => {
    for (let j = 0; j < counts[i]; j++) cells.push(p.color);
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-10 gap-0.5 w-fit">
        {cells.map((color, i) => (
          <div key={i} className="h-3.5 w-3.5 rounded-[2px]" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {PARTS.map((p, i) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] inline-block" style={{ backgroundColor: p.color }} />
            {p.label}由来 {counts[i]}%（{values[p.key].toFixed(1)}点）
          </span>
        ))}
      </div>
    </div>
  );
}
