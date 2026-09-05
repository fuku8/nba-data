"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

// スマホのアイコンナビは「試合」まで。プレーオフ以下はハンバーガーメニュー側に収める
const MOBILE_ICON_COUNT = 6;

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  className,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
  className?: string;
}) {
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground whitespace-nowrap",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // ページ遷移でメニューを閉じる
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center gap-4 px-4">
        <Link href="/" className="flex items-center shrink-0" aria-label="スタッツのかたち トップ">
          {/* PC: ロゴタイプ入り / スマホ: NSマークのみ */}
          <img src="/logo-ns1.svg" alt="" className="hidden sm:block h-8 w-auto" />
          <img src="/logo-ns-mark.svg" alt="" className="sm:hidden h-8 w-auto" />
        </Link>
        <nav className="flex h-12 min-w-0 flex-1 items-center space-x-1 overflow-x-auto">
          {navItems.map((item, i) => (
            <NavLink
              key={item.href}
              {...item}
              pathname={pathname}
              className={i >= MOBILE_ICON_COUNT ? "hidden sm:flex" : undefined}
            />
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="メニュー"
          className="sm:hidden shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {/* スマホ全メニュー（テキスト付き） */}
      {menuOpen && (
        <nav className="sm:hidden border-t bg-background px-4 py-2" aria-label="全メニュー">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                pathname === href || pathname.startsWith(href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
