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
import { Footer } from "@/components/Footer";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Log-Eats | 写真から栄養をチェック",
  description: "食事の写真をアップロードすると、概算のカロリーと栄養素を算出します。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="ja" data-theme="pastel">
      <body className={`min-h-screen font-sans antialiased bg-cream text-sage-900 flex flex-col ${session ? "pb-20 sm:pb-0" : ""}`}>
        <div className="flex-1">
          {children}
        </div>
        {!session && <Footer />}
        {session && <BottomNav />}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
