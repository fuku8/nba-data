import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import { navItems } from "@/components/layout/nav-items";
import { currentSeason } from "@/lib/season";
import { SITE_URL, SITE_NAME } from "@/lib/metadata";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "NBA のチーム・選手スタッツを、順位表・リーダーズ・散布図・パーセンタイルで見るダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W51Q1TQCNV"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-W51Q1TQCNV');`}
        </Script>
        <Navigation season={currentSeason()} />
        <main className="container mx-auto px-4 py-6">{children}</main>
        <footer className="border-t mt-10">
          <div className="container mx-auto px-4 py-8 space-y-5">
            {/* 全ページの一覧はフッターが持つ（ヘッダーは現状のアイコンナビのまま。2026-09-03 決定） */}
            <nav aria-label="フッターメニュー" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                {SITE_NAME}
              </Link>
              {" "}— 非公式・個人運営。データ: NBA.com/Stats（毎日取得）。
              <a href="/metrics#about" className="underline">
                このサイトについて
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
