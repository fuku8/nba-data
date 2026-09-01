import Link from "next/link";
import { cn } from "@/lib/utils";
import { allSeasons, currentSeason } from "@/lib/season";

// シーズン切替。パス区分（/players/[id] ⇔ /players/[id]/2025-26。plan.md §12-11）。
// 過去シーズンが1つも無い間は何も出さない。サーバーコンポーネント専用（fsを読む）
export function SeasonSwitch({ season, basePath }: { season: string; basePath: string }) {
  const seasons = allSeasons();
  if (seasons.length < 2) return null;
  const cur = currentSeason();
  const href = (s: string) => (s === cur ? basePath : `${basePath}/${s}`);
  return (
    <div role="group" aria-label="シーズン" className="inline-flex items-center rounded-lg border overflow-hidden text-xs font-semibold">
      {seasons.map((s, i) => (
        <Link
          key={s}
          href={href(s)}
          aria-current={s === season ? "page" : undefined}
          className={cn(
            "px-2.5 py-1 transition-colors",
            i > 0 && "border-l",
            s === season ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {s}
        </Link>
      ))}
    </div>
  );
}
