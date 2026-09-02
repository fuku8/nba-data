import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
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
      </body>
    </html>
  );
}
