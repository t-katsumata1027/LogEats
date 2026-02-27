import { SignIn, SignOut } from "@/components/AuthButtons";
import { auth } from "@/auth";
import { AnalyzerClient } from "@/components/AnalyzerClient";
import { HeaderNav } from "@/components/HeaderNav";
import { AddToHomeScreen, AddToHomeInlineCard, AddToHomeBanner } from "@/components/AddToHomeScreen";

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
            {!session?.user && <AddToHomeScreen />}
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
              {/* ① ホーム画面追加カード（スマホ向け） */}
              <AddToHomeInlineCard />
            </div>

            {/* Try it out Section */}
            <div className="relative z-10 mb-20 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="bg-white/50 backdrop-blur-md border border-sage-200/50 p-6 sm:p-8 rounded-3xl shadow-xl">
                <h3 className="text-xl font-bold text-sage-800 tracking-tight text-center mb-6 flex items-center justify-center gap-2">
                  <span>✨</span> ログイン不要でお試し
                </h3>
                <AnalyzerClient isLoggedIn={!!session} />
              </div>
            </div>

            {/* Release Notes */}
            <div className="mb-20">
              <h3 className="text-2xl font-bold text-sage-800 text-center mb-8 flex justify-center items-center gap-2 tracking-tight">
                <span>🚀</span> 最近のアップデート
              </h3>
              <div className="max-w-xl mx-auto space-y-4">
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                  <input type="radio" name="release-notes" defaultChecked />
                  <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                    <span className="badge badge-success badge-sm text-white">New</span>
                    <span>v1.2: 栄養素の目標許容幅を設定可能に</span>
                  </div>
                  <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                    <p>カロリーやPFC（タンパク質・脂質・炭水化物）の目標値に対して、**「±〇〇%以内なら達成とする」**という許容幅が設定できるようになりました。ぴったり合わせるのが難しい目標も、自分に合った幅で無理なく管理できます。</p>
                  </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                  <input type="radio" name="release-notes" />
                  <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                    <span className="badge badge-neutral badge-sm text-white">v1.1</span>
                    <span>写真がなくても文章で記録可能に</span>
                  </div>
                  <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                    <p>写真を撮り忘れても大丈夫！「ざるそば1枚と唐揚げ2個」のように**テキストを入力するだけ**で、AIが内容を読み取り、カロリーと栄養素を自動計算して記録します。</p>
                  </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                  <input type="radio" name="release-notes" />
                  <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                    <span className="badge badge-neutral badge-sm text-white">v1.0</span>
                    <span>週次グラフ＆カレンダーでの進捗管理</span>
                  </div>
                  <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                    <p>ダッシュボードに過去1週間の摂取カロリーとPFCの推移グラフを追加しました。目標を達成した日にはカレンダーに「⭐」バッジがつき、毎日のモチベーション維持に役立ちます。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features (Mockup Animations) */}
            <div className="mb-20 space-y-20">
              <div className="text-center">
                <h3 className="text-3xl font-extrabold text-sage-800 mb-3 tracking-tight">Log-Eats の特徴機能</h3>
                <p className="text-sage-500 text-sm sm:text-base mb-12">面倒な食事管理を、もっとラクに、楽しく。</p>
              </div>

              {/* Feature 1: AI Analysis Demo */}
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">📸</div>
                  <h4 className="text-2xl font-bold text-sage-800 tracking-tight">写真やテキストから即座にAI解析</h4>
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

              {/* Feature 2: Progress Tracking Demo */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">📊</div>
                  <h4 className="text-2xl font-bold text-sage-800 tracking-tight">進捗がひと目でわかるダッシュボード</h4>
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

              {/* Feature 3: Chat Correction Demo */}
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">🪄</div>
                  <h4 className="text-2xl font-bold text-sage-800 tracking-tight">AIとチャット感覚で柔軟に補正</h4>
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

              {/* Feature 4: Goals Auto Calc Demo */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">⚙️</div>
                  <h4 className="text-2xl font-bold text-sage-800 tracking-tight">身体情報から目標を自動計算</h4>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    年齢、身長、体重、普段の活動量を入力するだけで、あなたに最適な1日の目標カロリーとPFC（タンパク質・脂質・炭水化物）バランスをAIが自動計算します。
                  </p>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0 border border-sage-200 bg-white rounded-2xl shadow-xl overflow-hidden p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-sage-100 pb-2">
                      <span className="font-bold text-sage-800 text-sm">現在の体重</span>
                      <span className="text-sm font-medium">65.0 kg</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-sage-100 pb-2">
                      <span className="font-bold text-sage-800 text-sm">目標体重</span>
                      <span className="text-sm font-medium">60.0 kg</span>
                    </div>
                    <button className="btn btn-sm btn-block bg-sage-100 border-sage-300 text-sage-700 font-bold cursor-default hover:bg-sage-100">
                      ✨ 身体情報から自動計算
                    </button>
                    <div className="bg-sage-50 p-4 rounded-xl border border-sage-100 text-center animate-[fade-in-up_2s_ease-out_infinite_alternate]">
                      <div className="text-xs text-sage-600 font-bold mb-1">🔥 目標摂取カロリー</div>
                      <div className="text-2xl font-extrabold text-sage-800">1,850 <span className="text-xs font-normal">kcal</span></div>
                      <div className="flex justify-center gap-3 mt-3 text-xs font-bold bg-white p-2 rounded-lg border border-sage-100 shadow-sm">
                        <span className="text-blue-600">P: 96g</span>
                        <span className="text-purple-600">F: 51g</span>
                        <span className="text-green-600">C: 250g</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 5: History Graph Demo */}
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4">
                  <div className="text-4xl">📈</div>
                  <h4 className="text-2xl font-bold text-sage-800 tracking-tight">過去の履歴をグラフで振り返り</h4>
                  <p className="text-sage-600 leading-relaxed text-sm sm:text-base">
                    過去1週間の摂取カロリーと各栄養素の推移を折れ線グラフで表示。目標ライン（点線）との差分がひと目でわかり、振り返りが簡単になります。
                  </p>
                </div>
                <div className="flex-1 w-full max-w-sm shrink-0 border border-sage-200 bg-white rounded-2xl shadow-xl overflow-hidden p-5">
                  <h5 className="font-bold text-sage-800 text-sm mb-4">直近7日間の推移</h5>
                  {/* Fake Graph */}
                  <div className="relative h-32 w-full border-b border-l border-sage-200">
                    <div className="absolute top-[40%] left-0 w-full border-t-2 border-dashed border-sage-300 z-0"></div>
                    <span className="absolute top-[35%] -mt-4 left-1 text-[9px] text-sage-500 font-bold">目標値</span>
                    {/* SVG Line mimicking a chart */}
                    <svg className="absolute inset-0 h-full w-full z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <polyline
                        points="0,80 16,30 33,60 50,20 66,70 83,40 100,50"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="animate-[pulse_2s_ease-in-out_infinite]"
                      />
                      {/* Plot Points */}
                      <circle cx="0" cy="80" r="2" fill="#ea580c" />
                      <circle cx="16" cy="30" r="2" fill="#ea580c" />
                      <circle cx="33" cy="60" r="2" fill="#ea580c" />
                      <circle cx="50" cy="20" r="2" fill="#ea580c" />
                      <circle cx="66" cy="70" r="2" fill="#ea580c" />
                      <circle cx="83" cy="40" r="2" fill="#ea580c" />
                      <circle cx="100" cy="50" r="2" fill="#ea580c" />
                    </svg>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-medium text-sage-400">
                    <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>今日</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center py-12 px-6 border border-sage-200 bg-sage-50/50 rounded-3xl mb-8">
              <h3 className="text-2xl font-bold text-sage-800 mb-3 tracking-tight">さっそく毎日の食事を記録しましょう</h3>
              <p className="text-sage-500 text-sm mb-6">ログインして、目標PFCの設定からスタート！</p>
              <SignIn />
            </div>
          </>
        ) : (
          <AnalyzerClient isLoggedIn={!!session} />
        )}
      </div>
      {/* ② ホーム画面追加 固定バナー（スマホ向け） */}
      <AddToHomeBanner />
    </main>
  );
}
