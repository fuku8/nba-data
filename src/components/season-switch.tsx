import Link from "next/link";
import { cn } from "@/lib/utils";
import { allSeasons, currentSeason } from "@/lib/season";
import { seasonPath } from "@/lib/season-path";

// シーズン切替。過去季に残すページ（順位表・リーダーズ・プレーオフ）の見出し横に置く。
// パス区分（/standings ⇔ /standings/2025-26。plan.md §13-10）。
// 過去シーズンが1つも無い間は何も出さない。サーバーコンポーネント専用（fsを読む）
export function SeasonSwitch({ season, basePath }: { season: string; basePath: string }) {
  const seasons = allSeasons();
  if (seasons.length < 2) return null;
  const cur = currentSeason();
  const href = (s: string) => seasonPath(basePath, s === cur ? undefined : s);
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
