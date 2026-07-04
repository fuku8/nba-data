// ボール支配の帯: チーム内のタッチ数シェアを1本の積み上げバーで表示
// サーバーコンポーネント・divのみ

export interface PossessionSegment {
  name: string;
  share: number; // 0-1
}

export function PossessionBand({ segments, color }: { segments: PossessionSegment[]; color: string }) {
  if (segments.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex h-7 w-full overflow-hidden rounded-md">
        {segments.map((s, i) => (
          <div
            key={s.name}
            style={{
              width: `${s.share * 100}%`,
              backgroundColor: color,
              opacity: Math.max(0.2, 1 - i * 0.11),
            }}
            title={`${s.name} ${(s.share * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s, i) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[2px] inline-block"
              style={{ backgroundColor: color, opacity: Math.max(0.2, 1 - i * 0.11) }}
            />
            {s.name} {(s.share * 100).toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}
