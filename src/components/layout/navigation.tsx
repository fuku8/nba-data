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

// 単一ナビ。RS/POは「モード」ではなく各ページ内の ?phase= 切替と文脈バッジで示す（plan.md §12-2）
const navItems = [
  { href: "/standings", label: "順位表", icon: Trophy },
  { href: "/teams", label: "チーム", icon: BarChart3 },
  { href: "/players", label: "選手", icon: Users },
  { href: "/leaders", label: "リーダーズ", icon: Medal },
  { href: "/compare", label: "検索", icon: Search },
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

export function Navigation({ season }: { season: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center gap-4 px-4">
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <span className="text-base font-bold tracking-tight">NBA Data</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">{season}</span>
        </Link>
        <nav className="flex h-12 items-center space-x-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>
      </div>
    </header>
  );
}
