import { SignIn, SignOut } from "@/components/AuthButtons";
import { auth } from "@/auth";
import { AnalyzerClient } from "@/components/AnalyzerClient";

import { HeaderNav } from "@/components/HeaderNav";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen">
      <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
              Log-Eats
            </h1>
            <p className="text-sm text-sage-600 mt-0.5">
              写真をアップロードすると、概算のカロリーと栄養素を表示します
            </p>
          </div>
          <div className="flex items-center gap-4">
            <HeaderNav />
            {session?.user ? (
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <img src={session.user.image} alt="User avatar" className="w-8 h-8 rounded-full border border-sage-200" />
                )}
                <SignOut />
              </div>
            ) : (
              <SignIn />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!session && (
          <div className="mb-6 p-4 rounded-xl bg-sage-50 border border-sage-200 text-sm text-sage-800 flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-medium mb-1">食事の記録・振り返り機能が追加されました！</p>
              <p className="text-sage-600">
                右上の「ログイン」からログインすると、日々の食事カロリーやPFCバランスを自動で記録し、ダッシュボードで振り返ることができるようになります。
              </p>
            </div>
          </div>
        )}
        <AnalyzerClient />
      </div>
    </main>
  );
}
