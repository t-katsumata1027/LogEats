import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AnalyzerClient } from "@/components/AnalyzerClient";
import { CustomUserButton } from "@/components/CustomUserButton";
import { RecordingTabs } from "@/components/RecordingTabs";
import { AddToHomeInlineCard, AddToHomeBanner } from "@/components/AddToHomeScreen";
import { WeeklyChartDemo } from "@/components/WeeklyChartDemo";
import { ReleaseNotes } from "@/components/ReleaseNotes";
import { AdBanner } from "@/components/AdBanner";
import { LineConnectModalButton } from "@/components/LineConnectModalButton";
import { GoalCalculator } from "@/components/GoalCalculator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log-Eats | 写真を撮るだけのAI食事管理・カロリー計算アプリ",
  description: "【無料】食事の写真をアップロードするだけでAIがカロリーとPFCバランス（タンパク質・脂質・炭水化物）を自動計算。LINE連携でさらに便利に。面倒な食事記録をスマートに自動化します。",
  keywords: ["AI食事管理", "カロリー計算 アプリ", "PFCバランス 自動", "食事記録 写真", "ダイエット アプリ 無料", "Log-Eats"],
};

export default async function Home() {
  const { userId } = await auth();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Log-Eats",
        "url": process.env.NEXT_PUBLIC_APP_URL || "https://log-eats.vercel.app",
        "description": "食事の写真をアップロードするかテキストを入力するだけで、AIが瞬時に概算のカロリーとPFCを自動計算・記録するAI食事管理アプリです。",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "JPY"
        }
      },
      {
        "@type": "HowTo",
        "name": "Log-Eatsを使った食事記録の方法",
        "step": [
          {
            "@type": "HowToStep",
            "name": "食事の画像をアップロード",
            "text": "スマートフォンで撮影した食事の写真をアップロード、または食べた内容をテキストで入力します。"
          },
          {
            "@type": "HowToStep",
            "name": "AIが瞬時に解析",
            "text": "独自AIが画像を解析し、概算のカロリーとPFCバランス（タンパク質、脂質、炭水化物）を数秒で算出します。"
          },
          {
            "@type": "HowToStep",
            "name": "自動でグラフ化・保存",
            "text": "解析結果はダッシュボードに自動保存され、日々の栄養バランスの推移をグラフで簡単に確認できます。"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "画像解析の精度はどのくらいですか？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "最新のAIモデルを使用しており、一般的な料理であれば高い精度で解析可能です。また、チャット形式で「ご飯を半分にした」などの修正も簡単に行えます。"
            }
          },
          {
            "@type": "Question",
            "name": "無料で使えますか？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "はい、基本的な食事記録とAI解析機能はすべて無料でご利用いただけます。"
            }
          }
        ]
      }
    ]
  };

  return (
    <main className="flex-1 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className={userId ? "flex-1 flex flex-col w-full max-w-2xl mx-auto px-4 pt-2 pb-0 sm:py-4 overflow-hidden" : "flex-1 flex flex-col w-full max-w-2xl mx-auto px-4 pt-2 pb-0 sm:py-4"}>
        {!userId ? (
          <>
            {/* Hero Section */}
            <div className="text-center py-6 sm:py-10 mb-8 animate-fade-in-up">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-sage-900 tracking-tight mb-4">
                毎日の食事を、<br className="sm:hidden" /><span className="text-sage-600">AIで賢く記録</span>
              </h1>
              <p className="text-sage-600 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
                写真を撮るだけで、カロリーとPFC（タンパク質・脂質・炭水化物）を自動計算。<br className="hidden sm:block" />
                まずはログインなしで、下から画像解析を試してみてください👇
              </p>
              <div className="flex flex-col gap-3 justify-center items-center w-full">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
                  <LineConnectModalButton />
                  <SignInButton mode="modal">
                    <button className="btn btn-outline border-sage-300 hover:bg-sage-50 text-sage-700 rounded-full px-6 font-bold text-sm h-12">
                      その他のログイン / 登録
                    </button>
                  </SignInButton>
                </div>
                <span className="text-[11px] text-sage-400 font-medium">※無料で始められます</span>
              </div>
              {/* ① ホーム画面追加カード（スマホ向け） */}
              <AddToHomeInlineCard />
            </div>

            {/* Try it out Section */}
            <div className="relative z-10 mb-20 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="bg-white/50 backdrop-blur-md border border-sage-200/50 p-6 sm:p-8 rounded-3xl shadow-xl">
                <h3 className="text-xl font-bold text-sage-800 tracking-tight text-center mb-6 flex items-center justify-center gap-2">
                  <span>✨</span> ログイン不要でお試し
                </h3>
                <AnalyzerClient isLoggedIn={false} />
              </div>
            </div>

            {/* Release Notes */}
            <div className="mb-8">
              <ReleaseNotes />
            </div>

            {/* Ad Banner - Top Page 1 */}
            <div className="mb-20">
              <AdBanner adSlot="top-page-slot-1" className="min-h-[100px]" />
            </div>

            {/* Features (Mockup Animations) */}
            <div className="mb-20 space-y-20">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-sage-800 mb-3 tracking-tight">Log-Eats の特徴機能</h2>
                <p className="text-sage-500 text-sm sm:text-base mb-12">AIを活用して、あなたの健康管理をもっと身近に、正確に。</p>
              </div>

              {/* Feature 1: AI Analysis Demo */}
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">📸</div>
                  <h3 className="text-2xl font-bold text-sage-800 tracking-tight">写真やテキストから即座にAI解析</h3>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    手入力の面倒な栄養素検索は不要。料理の写真をアップロードするか、食べた内容をテキストで打つだけで、AIが瞬時にカロリーとPFCを計算します。
                  </p>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0 mockup-window border border-sage-200 bg-base-100 shadow-xl overflow-hidden aspect-[4/3] flex flex-col pt-4">
                  <div className="flex-1 px-4 py-6 bg-sage-50 flex flex-col items-center justify-center relative group">
                    {/* Fake Loading / Result Animation Sequence */}
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 animate-[fadeOut_2s_ease-in-out_infinite_alternate]">
                      <span className="loading loading-spinner text-sage-400 loading-lg"></span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-sage-100 w-full animate-[pulse_2s_ease-in-out_infinite_alternate]">
                      <div className="h-32 bg-sage-200/50 rounded-lg mb-4 flex items-center justify-center text-sage-400 font-bold">🍔 画像を解析中...</div>
                      <div className="space-y-2">
                        <div className="h-4 bg-sage-200 rounded w-1/2"></div>
                        <div className="h-4 bg-sage-100 rounded w-3/4"></div>
                        <div className="h-4 bg-sage-100 rounded w-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2: LINE Integration Demo */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">📱</div>
                  <h3 className="text-2xl font-bold text-sage-800 tracking-tight">LINEからいつものように写真を送るだけ</h3>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    LogEatsの公式LINEアカウントを友だち追加すれば、毎日の食事写真をLINEで送るだけでアプリに自動連携。わざわざブラウザを開く手間なくカロリー計算と記録が完了します。
                  </p>
                  <div className="pt-2">
                    <LineConnectModalButton />
                  </div>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0 border border-sage-200 bg-[#abc1d1] rounded-2xl shadow-xl overflow-hidden p-4 space-y-3">
                  <div className="text-center font-bold text-white text-xs mb-2">LogEats 公式</div>
                  {/* Chat Mockup for LINE */}
                  <div className="chat chat-end animate-[fade-in-up_2s_ease-out_infinite_alternate]">
                    <div className="chat-bubble bg-[#85e04b] text-sage-800 text-sm shadow-md">🍔 ハンバーガーセット</div>
                  </div>
                  <div className="chat chat-start">
                    <div className="chat-bubble bg-white text-sage-800 text-sm shadow-sm flex flex-col gap-1">
                      <div className="text-xs font-bold">🍽️ 記録完了！</div>
                      <div className="text-xs border-b border-sage-100 pb-1">カロリー: 650kcal<br/>タンパク質: 25.0g<br/>脂質: 30.0g<br/>炭水化物: 70.0g</div>
                      <div className="text-xs text-blue-500 mt-1">✅ 記録を確認・修正する</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 3: Progress Tracking Demo */}
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">📊</div>
                  <h3 className="text-2xl font-bold text-sage-800 tracking-tight">進捗がひと目でわかるダッシュボード</h3>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    1日の目標に対するカロリーやPFCの達成度をプログレスバーで可視化。過去の履歴もカレンダーや週次グラフで振り返れるので、目標達成へのモチベーションが続きます。
                  </p>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0 border border-sage-200 bg-white rounded-2xl shadow-xl overflow-hidden p-5 space-y-5">
                  {/* Fake PFC Progress Bars */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-sage-800 mb-1">
                      <span>🔥 カロリー</span>
                      <span className="text-emerald-500">⭐ 達成！</span>
                    </div>
                    <div className="w-full bg-sage-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full w-0 animate-[fillBar_3s_ease-out_infinite]" style={{ maxWidth: '90%' }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-sage-50 rounded-xl p-2 text-center border border-sage-100">
                      <div className="text-[10px] text-sage-500 mb-1">💪 Protein</div>
                      <div className="text-sm font-bold text-sage-800">110g</div>
                      <div className="w-full bg-white rounded-full h-1 mt-1 overflow-hidden">
                        <div className="bg-blue-400 h-full rounded-full animate-[fillBar_3s_ease-out_infinite_0.5s]" style={{ maxWidth: '85%' }}></div>
                      </div>
                    </div>
                    <div className="bg-sage-50 rounded-xl p-2 text-center border border-sage-100">
                      <div className="text-[10px] text-sage-500 mb-1">🥑 Fat</div>
                      <div className="text-sm font-bold text-sage-800">45g</div>
                      <div className="w-full bg-white rounded-full h-1 mt-1 overflow-hidden">
                        <div className="bg-purple-400 h-full rounded-full animate-[fillBar_3s_ease-out_infinite_1s]" style={{ maxWidth: '60%' }}></div>
                      </div>
                    </div>
                    <div className="bg-sage-50 rounded-xl p-2 text-center border border-sage-100">
                      <div className="text-[10px] text-sage-500 mb-1">🌾 Carbs</div>
                      <div className="text-sm font-bold text-red-500">300g</div>
                      <div className="w-full bg-white rounded-full h-1 mt-1 overflow-hidden">
                        <div className="bg-red-400 h-full rounded-full animate-[fillBar_3s_ease-out_infinite_1.5s]" style={{ maxWidth: '100%' }}></div>
                      </div>
                    </div>
                  </div>
                  {/* Fake Calendar row */}
                  <div className="flex justify-between px-2 pt-2 border-t border-sage-100">
                    {['月', '火', '水', '木', '金', '土', '日'].map((d, i) => (
                      <div key={d} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-sage-400">{d}</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${(i === 1 || i === 3 || i === 4) ? 'bg-emerald-50 text-emerald-500 font-bold border border-emerald-200' : 'text-sage-600 bg-white'}`}>
                          {(i === 1 || i === 3 || i === 4) ? '⭐' : i === 5 ? '⚠️' : i + 10}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature 4: Chat Correction Demo */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">🪄</div>
                  <h3 className="text-2xl font-bold text-sage-800 tracking-tight">AIとチャット感覚で柔軟に補正</h3>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    「ご飯は半分しか食べていない」「ドレッシングを変えた」など、あとから自然言語で修正指示を出すことで、より正確な記録が可能です。
                  </p>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0 border border-sage-200 bg-sage-50 rounded-2xl shadow-xl overflow-hidden p-4 space-y-3">
                  {/* Chat Mockup */}
                  <div className="chat chat-end animate-[fade-in-up_2s_ease-out_infinite_alternate]">
                    <div className="chat-bubble bg-sage-600 text-white text-sm shadow-md">ご飯は半分残しました</div>
                  </div>
                  <div className="chat chat-start">
                    <div className="chat-bubble bg-white text-sage-800 border border-sage-200 text-sm shadow-sm flex flex-col gap-1">
                      <div className="font-bold">再計算しました！</div>
                      <div className="text-xs text-sage-500 line-through">カロリー: 500 kcal</div>
                      <div className="text-emerald-600 font-bold text-[13px]">👉 カロリー: 380 kcal (-120kcal)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 5: Goals Auto Calc (Interactive) */}
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">⚙️</div>
                  <h3 className="text-2xl font-bold text-sage-800 tracking-tight">身体情報から目標を自動計算</h3>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    年齢、身長、体重、普段の活動量を入力するだけで、あなたに最適な1日の目標カロリーとPFC（タンパク質・脂質・炭水化物）バランスをAIが自動計算します。
                  </p>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0">
                  <GoalCalculator />
                </div>
              </div>

              {/* Feature 6: History Graph Demo */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">📈</div>
                  <h3 className="text-2xl font-bold text-sage-800 tracking-tight">過去の履歴をグラフで振り返り</h3>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    過去1週間の摂取カロリーと各栄養素の推移を折れ線グラフで表示。目標ライン（点線）との差分がひと目でわかり、振り返りが簡単になります。
                  </p>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0 border border-sage-200 bg-white rounded-2xl shadow-xl overflow-hidden p-5">
                  <h5 className="font-bold text-sage-800 text-sm mb-1">直近7日間の推移</h5>
                  {/* Fake Graph */}
                  <WeeklyChartDemo />
                </div>
              </div>
            </div>

            <div className="text-center py-12 px-6 border border-sage-200 bg-sage-50/50 rounded-3xl mb-8">
              <h3 className="text-2xl font-bold text-sage-800 mb-3 tracking-tight">さっそく毎日の食事を記録しましょう</h3>
              <p className="text-sage-500 text-sm mb-6">ログインして、目標PFCの設定からスタート！</p>
              <SignInButton mode="modal">
                <button className="btn btn-primary bg-sage-600 hover:bg-sage-700 text-white border-none rounded-full px-8 font-bold">ログイン / 登録</button>
              </SignInButton>
            </div>
          </>
        ) : (
          <div className="flex flex-col w-full pb-0 h-[calc(100dvh-130px)] sm:h-[calc(100dvh-97px)] -mx-4 sm:mx-0 min-w-[100vw] sm:min-w-0">
            <RecordingTabs isLoggedIn={true} />
          </div>
        )}
      </div>
      {/* ② ホーム画面追加 固定バナー（スマホ向け） */}
      {!userId && <AddToHomeBanner />}
    </main>
  );
}
