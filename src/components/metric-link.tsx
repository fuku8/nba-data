import Link from "next/link";
import { CircleHelp } from "lucide-react";

// 指標カードから /metrics の該当解説セクションへ飛ぶ「?」リンク
export function MetricLink({ anchor }: { anchor: string }) {
  return (
    <Link
      href={`/metrics#${anchor}`}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="この指標の解説を見る"
    >
      <CircleHelp className="h-4 w-4" />
      <span className="sr-only">この指標の解説を見る</span>
    </Link>
  );
}
