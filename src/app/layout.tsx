import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import { navItems } from "@/components/layout/nav-items";
import { SITE_URL, SITE_NAME } from "@/lib/metadata";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "NBA のチーム・選手スタッツを、順位表・リーダーズ・散布図・パーセンタイルで見るダッシュボード",
  // favicon.ico は app/favicon.ico の規約で配信。PNG各種は public/favicons/ から
  icons: {
    icon: [
      { url: "/favicons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicons/apple-touch-icon.png",
  },
  manifest: "/favicons/manifest.json",
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
        <Navigation />
        <main className="container mx-auto px-4 py-6">{children}</main>
        <footer className="border-t mt-10">
          {/* 上下50pxはモック実測値。中の間隔はモックから詰めた: ロゴ→ナビ24px・ナビ→出典行20px（2026-09-05） */}
          <div className="container mx-auto px-4 py-[50px]">
            <Link href="/" className="flex justify-center" aria-label="スタッツのかたち トップ">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* モックは50pxだったが実ページでは目立ちすぎたため縮小（スマホ28px / PC40px。2026-09-05） */}
              <img src="/logo-ns1.svg" alt="スタッツのかたち The Shape of Numbers" className="h-7 sm:h-10 w-auto" />
            </Link>
            {/* 全ページの一覧はフッターが持つ（2026-09-03 決定） */}
            <nav aria-label="フッターメニュー" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                {SITE_NAME}
              </Link>
              {"　"}データ: NBA.com/Stats（毎日取得）
              {/* スマホでは2行目に折り返す */}
              <a href="/metrics#about" className="underline block sm:inline mt-1 sm:mt-0 sm:ml-3">
                このサイトについて
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
