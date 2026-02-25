import { SignIn, SignOut } from "@/components/AuthButtons";
import { auth } from "@/auth";
import { AnalyzerClient } from "@/components/AnalyzerClient";

import { HeaderNav } from "@/components/HeaderNav";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen">
      <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
              Log-Eats
            </h1>
            <p className="text-xs sm:text-sm text-sage-600 mt-1 leading-snug">
              写真をアップロードすると、概算のカロリーと栄養素を表示します
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {session?.user ? (
              <>
                <HeaderNav />
                <div className="flex items-center gap-2 sm:gap-3">
                  {session.user.email === process.env.ADMIN_EMAIL && (
                    <a
                      href="/admin"
                      className="btn btn-xs sm:btn-sm btn-outline border-sage-300 text-sage-700 hover:bg-sage-100 hover:border-sage-400 hidden sm:flex items-center gap-1"
                    >
                      <span>⚙️</span>管理画面
                    </a>
                  )}
                  {session.user.image && (
                    <img src={session.user.image} alt="User avatar" className="w-8 h-8 rounded-full border border-sage-200" />
                  )}
                  <SignOut />
                </div>
              </>
            ) : (
              <SignIn />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!session ? (
          <>
            {/* Hero Section */}
            <div className="text-center py-6 sm:py-10 mb-8 animate-fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-sage-900 tracking-tight mb-4">
                毎日の食事を、<br className="sm:hidden" /><span className="text-sage-600">AIで賢く記録</span>
              </h2>
              <p className="text-sage-600 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
                写真を撮るだけで、カロリーとPFC（タンパク質・脂質・炭水化物）を自動計算。<br className="hidden sm:block" />
                まずはログインなしで、下から画像解析を試してみてください👇
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <SignIn />
                <span className="text-xs text-sage-400 font-medium">※無料で始められます</span>
              </div>
            </div>

            {/* Try it out Section */}
            <div className="relative z-10 mb-16">
              <AnalyzerClient isLoggedIn={!!session} />
            </div>

            {/* Features Section */}
            <div className="mb-16 space-y-10">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-sage-800 mb-2">Log-Eats の3つの特徴</h3>
                <p className="text-sage-500 text-sm">面倒な食事管理を、もっとラクに。</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Feature 1 */}
                <div className="card bg-white shadow-sm border border-sage-100 p-6 text-center hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">📸</div>
                  <h4 className="font-bold text-sage-800 mb-2">写真からAI解析</h4>
                  <p className="text-xs text-sage-600 leading-relaxed">
                    面倒な手入力は不要。料理の写真をアップするだけで、カロリーと栄養素をAIが瞬時に計算します。
                  </p>
                </div>
                {/* Feature 2 */}
                <div className="card bg-white shadow-sm border border-sage-100 p-6 text-center hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">📊</div>
                  <h4 className="font-bold text-sage-800 mb-2">日々の数値を管理</h4>
                  <p className="text-xs text-sage-600 leading-relaxed">
                    ダッシュボードのカレンダーで摂取カロリーとPFCバランスを可視化。目標に向けた進捗がひと目でわかります。
                  </p>
                </div>
                {/* Feature 3 */}
                <div className="card bg-white shadow-sm border border-sage-100 p-6 text-center hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">🪄</div>
                  <h4 className="font-bold text-sage-800 mb-2">柔軟なAI補正</h4>
                  <p className="text-xs text-sage-600 leading-relaxed">
                    「ご飯は少なめだった」など、チャット感覚でAIに微調整を指示することで、より正確な記録が可能です。
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center py-10 border-t border-sage-100">
              <h3 className="text-xl font-bold text-sage-800 mb-4">さっそく始めましょう</h3>
              <SignIn />
            </div>
          </>
        ) : (
          <AnalyzerClient isLoggedIn={!!session} />
        )}
      </div>
    </main>
  );
}
