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
  { href: "/playoffs", label: "トップ", icon: Trophy },
  { href: "/playoffs/players", label: "選手", icon: Users },
  { href: "/playoffs/leaders", label: "リーダーズ", icon: Medal },
  { href: "/playoffs/games", label: "試合", icon: Calendar },
  { href: "/playoffs/compare", label: "比較", icon: GitCompareArrows },
  { href: "/playoffs/search", label: "検索", icon: Search },
];

function NavLink({ href, label, icon: Icon, pathname }: { href: string; label: string; icon: React.ElementType; pathname: string }) {
  const isActive =
    href === "/playoffs"
      ? pathname === "/playoffs"
      : href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground whitespace-nowrap",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const isPlayoffs = pathname.startsWith("/playoffs");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="mr-4 flex items-center space-x-2 shrink-0">
          <span className="text-lg font-bold">NBA Data</span>
        </Link>
        <nav className="flex items-center space-x-1 overflow-x-auto">
          {rsNavItems.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
          <div className="mx-2 h-5 w-px bg-border shrink-0" />
          <span className={cn(
            "text-xs font-semibold px-1 shrink-0",
            isPlayoffs ? "text-orange-500" : "text-muted-foreground"
          )}>
            PO
          </span>
          {poNavItems.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>
      </div>
    </header>
  );
}
