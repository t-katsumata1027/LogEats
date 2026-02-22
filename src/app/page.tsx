import { SignIn, SignOut } from "@/components/AuthButtons";
import { auth } from "@/auth";
import { AnalyzerClient } from "@/components/AnalyzerClient";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen">
      <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
              食事カロリー推定
            </h1>
            <p className="text-sm text-sage-600 mt-0.5">
              写真をアップロードすると、概算のカロリーと栄養素を表示します
            </p>
          </div>
          <div className="flex items-center gap-4">
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
        {!session ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-sage-100 flex flex-col items-center gap-4 cursor-default">
            <h2 className="text-lg font-medium text-sage-800">ログインして記録を開始</h2>
            <p className="text-sage-600 mb-2">
              食事を記録・分析するには、Googleアカウントでのログインが必要です。
            </p>
            <SignIn />
          </div>
        ) : (
          <AnalyzerClient />
        )}
      </div>
    </main>
  );
}
