import type { Metadata, Viewport } from "next";
import { Inter, Zen_Kaku_Gothic_New } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { jaJP } from '@clerk/localizations';
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from '@next/third-parties/google';
import { siteUrl } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const zenGothic = Zen_Kaku_Gothic_New({
  // 通常文と見出しで使用するウェイトに限定し、公開ページのフォント転送量を抑える。
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-zen-gothic",
  display: "swap",
});

import { AppShell } from "@/components/AppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafafa", // Use a suitable theme color, cream/sage-ish
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "sQIryQWe8QfEbcpy5MRWQJfk603ogxuaEe3d0PF2Yfk",
  },
};

const customLocalization = {
  ...jaJP,
  userButton: {
    ...jaJP.userButton,
    action__manageAccount: 'アカウント連携',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <ClerkProvider localization={customLocalization}>
      <html lang="ja" data-theme="pastel">
        <head>
          {adsenseClientId && (
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
              crossOrigin="anonymous"
            ></script>
          )}
        </head>
        <body className={`min-h-screen ${inter.variable} ${zenGothic.variable} font-sans antialiased bg-cream text-sage-900 flex flex-col`}>
          <AppShell>{children}</AppShell>
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
