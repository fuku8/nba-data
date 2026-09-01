import Link from "next/link";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { PHASE_LABEL, type Phase } from "@/lib/phase";

// 数字の横に置く文脈ラベル。RS/POはグローバルな「モード」ではなくデータ側に付く（plan.md §12-2）
export function PhaseBadge({ phase, className }: { phase: Phase; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        phase === "po" ? "bg-orange-500 text-white" : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {phase === "po" && <Trophy className="h-3 w-3" />}
      {PHASE_LABEL[phase]}
    </span>
  );
}

// ページ見出し横の RS｜PO セグメント。URLの ?phase=po で切り替える（既定は常にRS）。
// POデータが無いときは切替先が無いのでバッジだけを出す
export function PhaseSwitch({
  phase,
  poAvailable,
  pathname,
  params = {},
}: {
  phase: Phase;
  poAvailable: boolean;
  pathname: string;
  params?: Record<string, string | undefined>;
}) {
  if (!poAvailable) return <PhaseBadge phase="rs" />;
  const href = (p: Phase) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "phase") q.set(k, v);
    if (p === "po") q.set("phase", "po");
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  return (
    <div role="group" aria-label="期間" className="inline-flex items-center rounded-lg border overflow-hidden text-sm font-semibold">
      <Link
        href={href("rs")}
        aria-current={phase === "rs" ? "page" : undefined}
        className={cn("px-3 py-1.5 transition-colors", phase === "rs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}
      >
        Regular Season
      </Link>
      <Link
        href={href("po")}
        aria-current={phase === "po" ? "page" : undefined}
        className={cn("px-3 py-1.5 border-l transition-colors flex items-center gap-1.5", phase === "po" ? "bg-orange-500 text-white" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}
      >
        <Trophy className="h-3.5 w-3.5" />
        Playoffs
      </Link>
    </div>
  );
}
