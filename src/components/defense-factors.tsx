// 守備4ファクターのリーグ順位バー: 「何で守るチームか」を4部門の順位で表示
// サーバーコンポーネント・divのみ（PossessionBand と同型）

export interface DefenseFactorRow {
  label: string; // 例: シュート抑止
  metric: string; // 例: 被eFG%
  value: string; // 書式済みの表示値
  rank: number; // 1 = リーグ最良
}

export function DefenseFactors({ rows, teams, color }: { rows: DefenseFactorRow[]; teams: number; color: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-xs mb-1.5">
            <span>
              {r.label}
              <span className="text-muted-foreground">（{r.metric}）</span>
            </span>
            <span className="font-mono shrink-0">
              <span className="font-semibold">{r.rank}位</span>
              <span className="text-muted-foreground"> · {r.value}</span>
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-muted">
            {/* マーカーの端の見切れを防ぐため、位置決めは左右に余白を取った内側の座標で行う */}
            <div className="absolute inset-y-0 left-2 right-2">
              <div className="absolute left-1/2 -top-0.5 -bottom-0.5 w-px bg-foreground/20" />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
                style={{ left: `${((r.rank - 1) / (teams - 1)) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>← リーグ1位（良い）</span>
        <span>{teams}位 →</span>
      </div>
    </div>
  );
}
