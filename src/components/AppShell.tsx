"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { BottomNav } from "@/components/BottomNav";
import { EventTracker } from "@/components/EventTracker";
import { Footer } from "@/components/Footer";
import { GlobalHeader } from "@/components/GlobalHeader";

/**
 * 認証状態に依存する共通UIをクライアント側に閉じ込める。
 * 公開ページのサーバー描画を認証情報によって動的化しないための境界。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EventTracker />
      <GlobalHeader />
      <SignedOut>
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </SignedOut>
      <SignedIn>
        <div className="flex flex-1 flex-col pb-20 sm:pb-0">{children}</div>
        <BottomNav />
      </SignedIn>
    </>
  );
}
