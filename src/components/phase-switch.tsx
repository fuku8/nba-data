import Link from "next/link";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PHASE_LABEL, phasePath, type Phase } from "@/lib/phase";

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

// ページ見出し横の RS｜PO セグメント。/players ⇔ /players/po のパスで切り替える（既定は常にRS）。
// POデータが無いときは切替先が無いのでバッジだけを出す。params はクライアント側だけが読むクエリ（例: 比較の ids）
export function PhaseSwitch({
  phase,
  poAvailable,
  basePath,
  params = {},
}: {
  phase: Phase;
  poAvailable: boolean;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (!poAvailable) return <PhaseBadge phase="rs" />;
  const href = (p: Phase) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `${phasePath(basePath, p)}?${s}` : phasePath(basePath, p);
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

// POデータが無いシーズンの /po ページ
export function PreSeasonNotice() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-2xl font-bold mb-2">プレーオフ開幕前</h1>
      <p className="text-muted-foreground">プレーオフが開始されるとデータが表示されます。</p>
    </div>
  );
}

// RS｜PO のタブ見出し（トップとチーム詳細で共用）。<Tabs> の中で使う
export function PhaseTabsList() {
  return (
    <TabsList>
      <TabsTrigger value="rs" className="px-3">Regular Season</TabsTrigger>
      <TabsTrigger value="po" className="px-3 data-active:bg-orange-500 data-active:text-white dark:data-active:bg-orange-500 dark:data-active:text-white">
        <Trophy />
        Playoffs
      </TabsTrigger>
    </TabsList>
  );
}
