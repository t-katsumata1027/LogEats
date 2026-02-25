import type { Metadata } from "next";
import { Inter, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const zenGothic = Zen_Kaku_Gothic_New({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-gothic",
  display: "swap",
});

import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: {
    template: "%s | Log-Eats",
    default: "Log-Eats | 写真から栄養をチェック",
  },
  description: "食事の写真をアップロードすると、概算のカロリーと栄養素を算出します。",
  applicationName: "Log-Eats",
  appleWebApp: {
    title: "Log-Eats",
    statusBarStyle: "default",
    capable: true,
  },
  openGraph: {
    siteName: "Log-Eats",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="ja" data-theme="pastel">
      <body className={`min-h-screen ${inter.variable} ${zenGothic.variable} font-sans antialiased bg-cream text-sage-900 flex flex-col ${session ? "pb-20 sm:pb-0" : ""}`}>
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
