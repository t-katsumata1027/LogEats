import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "食事カロリー推定 | 写真から栄養をチェック",
  description: "食事の写真をアップロードすると、概算のカロリーと栄養素を算出します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={noto.variable}>
      <body className="min-h-screen font-sans antialiased bg-cream text-sage-900 pb-20 sm:pb-0">
        {children}
        <BottomNav />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
