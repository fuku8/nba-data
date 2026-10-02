import Link from "next/link";
import { cn } from "@/lib/utils";

// チームページへのリンク。チームページは今季分しか無いので、過去季のページ（pastSeason あり）では
// 文字だけにする（過去季を見ていて今季のページへ移らないように。plan.md §13-10・2026-10-02 決定）
export function TeamLink({
  abbr,
  pastSeason,
  className,
  children,
}: {
  abbr: string;
  pastSeason?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (pastSeason) return <span className={cn(className, "hover:no-underline")}>{children}</span>;
  return <Link href={`/teams/${abbr}`} className={className}>{children}</Link>;
}
