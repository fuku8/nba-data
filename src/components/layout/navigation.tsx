"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemsFor } from "./nav-items";
import { pastSeasonOf } from "@/lib/season-path";

// スマホのアイコンナビは「試合」まで。プレーオフ以下はハンバーガーメニュー側に収める
const MOBILE_ICON_COUNT = 6;

function NavLink({
  href,
  match,
  label,
  icon: Icon,
  pathname,
  className,
}: {
  href: string;
  match: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
  className?: string;
}) {
  const isActive = pathname.startsWith(match);
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

// 過去季のページ（/standings/2025-26 など）では、季のラベル＋残すページ＋「今季へ」だけを出す（plan.md §13-10）。
// currentSeason は layout（サーバー側）が data/season.txt から渡す
export function Navigation({ currentSeason }: { currentSeason: string }) {
  const pathname = usePathname();
  const pastSeason = pastSeasonOf(pathname, currentSeason);
  const items = navItemsFor(pastSeason);
  const [menuOpen, setMenuOpen] = useState(false);

  // ページ遷移でメニューを閉じる
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* モック実測値: PC はヘッダー約84px・ロゴ約40px、ナビはセンターでなくロゴ下端揃え
          （下から18px。内容はロゴ下部より5pxほど上に見える）。スマホは47px・マーク28pxでセンター */}
      <div className="container mx-auto flex h-12 sm:h-[84px] items-center sm:items-end gap-4 px-4 sm:pb-[18px]">
        <Link href="/" className="flex items-center shrink-0" aria-label="スタッツのかたち トップ">
          {/* PC: ロゴタイプ入り / スマホ: NSマークのみ */}
          <img src="/logo-ns1.svg" alt="" className="hidden sm:block h-10 w-auto" />
          <img src="/logo-ns-mark.svg" alt="" className="sm:hidden h-7 w-auto" />
        </Link>
        <nav className="flex min-w-0 flex-1 items-center space-x-1 overflow-x-auto">
          {pastSeason && (
            <span className="shrink-0 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums">{pastSeason}</span>
          )}
          {items.map((item, i) => (
            <NavLink
              key={item.href}
              {...item}
              pathname={pathname}
              className={i >= MOBILE_ICON_COUNT ? "hidden sm:flex" : undefined}
            />
          ))}
          {pastSeason && (
            <Link href="/" className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground whitespace-nowrap">
              今季へ →
            </Link>
          )}
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
          {items.map(({ href, match, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                pathname.startsWith(match)
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

// フッターの全ページ一覧。ヘッダーと同じく、過去季のページでは残すページだけを季つきで出す
export function FooterNav({ currentSeason }: { currentSeason: string }) {
  const pastSeason = pastSeasonOf(usePathname(), currentSeason);
  return (
    <nav aria-label="フッターメニュー" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      {navItemsFor(pastSeason).map((item) => (
        <Link key={item.href} href={item.href} className="hover:text-foreground">
          {item.label}
        </Link>
      ))}
      {pastSeason && <Link href="/" className="hover:text-foreground">今季へ →</Link>}
    </nav>
  );
}
