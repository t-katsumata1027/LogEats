import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Zen_Kaku_Gothic_New } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { jaJP } from '@clerk/localizations';
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from '@next/third-parties/google';

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
import { auth } from '@clerk/nextjs/server';
import { EventTracker } from "@/components/EventTracker";
import { GlobalHeader } from "@/components/GlobalHeader";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafafa", // Use a suitable theme color, cream/sage-ish
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://log-eats.vercel.app"),
  title: {
    template: "%s | Log-Eats",
    default: "Log-Eats | 写真から栄養をチェック",
  },
  description: "面倒な食事管理を、もっとラクに、楽しく。食事の写真をアップロードするかテキストを入力するだけで、AIが瞬時に概算のカロリーとPFC（タンパク質・脂質・炭水化物）を自動計算・記録するAI食事管理アプリです。",
  keywords: ["食事記録", "カロリー計算", "PFCバランス", "AI", "写真", "ダイエット", "無料"],
  authors: [{ name: "Log-Eats Team" }],
  applicationName: "Log-Eats",
  appleWebApp: {
    title: "Log-Eats",
    statusBarStyle: "default",
    capable: true,
  },
  openGraph: {
    title: "Log-Eats | 写真から栄養をチェック",
    description: "面倒な食事管理を、もっとラクに、楽しく。食事の写真をアップロードするかテキストを入力するだけで、AIが瞬時に概算のカロリーとPFCを自動計算・記録するAI食事管理アプリです。",
    url: "/",
    siteName: "Log-Eats",
    images: [
      {
        url: "/og-image.png", // Ensure you have an og-image.png in public
        width: 1200,
        height: 630,
        alt: "Log-Eats",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Log-Eats | 写真から栄養をチェック",
    description: "面倒な食事管理を、もっとラクに、楽しく。食事の写真をアップロードするかテキストを入力するだけで、AIが瞬時に概算のカロリーとPFCを自動計算・記録するAI食事管理アプリです。",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

const customLocalization = {
  ...jaJP,
  userButton: {
    ...jaJP.userButton,
    action__manageAccount: 'アカウント連携',
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <ClerkProvider localization={customLocalization}>
      <html lang="ja" data-theme="pastel">
        <head>
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-1876950666503870"}`}
            crossOrigin="anonymous"
          ></script>
        </head>
        <body className={`min-h-screen ${inter.variable} ${zenGothic.variable} font-sans antialiased bg-cream text-sage-900 flex flex-col ${userId ? "pb-20 sm:pb-0" : ""}`}>
          <EventTracker />
          <GlobalHeader />
          <div className="flex-1">
            {children}
          </div>
          {!userId && <Footer />}
          {userId && <BottomNav />}
          <Analytics />
          <SpeedInsights />
          {process.env.NEXT_PUBLIC_GA_ID && (
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
