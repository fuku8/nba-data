"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Trophy,
  Users,
  BarChart3,
  Search,
  Calendar,
  Medal,
  LayoutDashboard,
  BookOpen,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 単一ナビ。RS/POは「モード」ではなく各ページ内の /po パス切替と文脈バッジで示す（plan.md §12-2）
const navItems = [
  { href: "/standings", label: "順位表", icon: Trophy },
  { href: "/teams", label: "チーム", icon: BarChart3 },
  { href: "/players", label: "選手", icon: Users },
  { href: "/leaders", label: "リーダーズ", icon: Medal },
  { href: "/compare", label: "比較", icon: Search },
  { href: "/games", label: "試合", icon: Calendar },
  { href: "/playoffs", label: "プレーオフ", icon: LayoutDashboard },
  { href: "/types", label: "タイプ", icon: Shapes },
  { href: "/metrics", label: "指標解説", icon: BookOpen },
];

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  exact = false,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
  exact?: boolean;
}) {
  const isActive = exact ? pathname === href : pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground whitespace-nowrap",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

// ロゴマーク: Heartbeat 壁と同じモチーフ（基準線の上下に伸びる点差バー）。スマホでは文字の代わりにこれだけ出す
function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <g fill="currentColor">
        <rect x="1.5" y="6" width="3" height="6" rx="1" />
        <rect x="6" y="2.5" width="3" height="9.5" rx="1" fill="#f97316" />
        <rect x="10.5" y="8" width="3" height="4" rx="1" />
        <rect x="15" y="12" width="3" height="7.5" rx="1" opacity="0.55" />
        <rect x="19.5" y="12" width="3" height="4.5" rx="1" opacity="0.55" />
      </g>
    </svg>
  );
}

export function Navigation({ season }: { season: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <LogoMark />
          <span className="text-base font-bold tracking-tight hidden sm:inline">スタッツのかたち</span>
          <span className="text-xs text-muted-foreground hidden md:inline">NBA {season}</span>
        </Link>
        <div className="relative min-w-0 flex-1">
          <nav className="flex h-12 items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </nav>
          {/* モバイルで右にまだ項目があることを示すフェード（横スクロールの手がかり） */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-background via-background/70 to-transparent sm:hidden" />
        </div>
      </div>
    </header>
  );
}
