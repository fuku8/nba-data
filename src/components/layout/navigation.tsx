"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Trophy,
  Users,
  BarChart3,
  Search,
  GitCompareArrows,
  Calendar,
  Medal,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const rsNavItems = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/standings", label: "順位表", icon: Trophy },
  { href: "/teams", label: "チーム", icon: BarChart3 },
  { href: "/players", label: "選手", icon: Users },
  { href: "/leaders", label: "リーダーズ", icon: Medal },
  { href: "/compare", label: "比較", icon: GitCompareArrows },
  { href: "/games", label: "試合", icon: Calendar },
  { href: "/search", label: "検索", icon: Search },
];

const poNavItems = [
  { href: "/playoffs", label: "トップ", icon: LayoutDashboard },
  { href: "/playoffs/players", label: "選手", icon: Users },
  { href: "/playoffs/leaders", label: "リーダーズ", icon: Medal },
  { href: "/playoffs/compare", label: "比較", icon: GitCompareArrows },
  { href: "/playoffs/games", label: "試合", icon: Calendar },
  { href: "/playoffs/search", label: "検索", icon: Search },
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

export function Navigation({ isPlayoffSeason = false }: { isPlayoffSeason?: boolean }) {
  const pathname = usePathname();
  const isPlayoffs = pathname.startsWith("/playoffs") || (isPlayoffSeason && pathname === "/");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* 上段: ロゴ + RS/POモード切替 */}
      <div className="container mx-auto flex h-12 items-center justify-between px-4 border-b border-border/40">
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <span className="text-base font-bold tracking-tight">NBA Data</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">2025-26</span>
        </Link>

        <div className="flex items-center rounded-lg border overflow-hidden text-sm font-semibold">
          <Link
            href="/standings"
            className={cn(
              "px-4 py-1.5 transition-colors",
              !isPlayoffs
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            Regular Season
          </Link>
          <Link
            href="/playoffs"
            className={cn(
              "px-4 py-1.5 border-l transition-colors flex items-center gap-1.5",
              isPlayoffs
                ? "bg-orange-500 text-white"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Playoffs
          </Link>
        </div>
      </div>

      {/* 下段: コンテキストナビ */}
      <div className="container mx-auto px-4">
        <nav className="flex h-10 items-center space-x-1 overflow-x-auto">
          {isPlayoffs
            ? poNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  pathname={pathname}
                  exact={item.href === "/playoffs"}
                />
              ))
            : rsNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  pathname={pathname}
                  exact={item.href === "/"}
                />
              ))}
        </nav>
      </div>
    </header>
  );
}
