import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import { isPlayoffDataAvailable } from "@/lib/data/playoffs";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "NBA Data Dashboard",
  description: "NBA チーム・選手スタッツダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isPlayoffSeason = isPlayoffDataAvailable();
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
        <Navigation isPlayoffSeason={isPlayoffSeason} />
        <main className="container mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
