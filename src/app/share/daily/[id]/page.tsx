import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { NutritionSummary } from "@/lib/types";

interface DailySharePageProps {
  params: Promise<{ id: string }>;
}

async function getDailyData(id: string) {
  const isUuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(id);
  
  // share_id から設定を取得
  let share;
  if (isUuid) {
    const { rows: shareRows } = await sql`
      SELECT * FROM daily_shares WHERE share_id = ${id} LIMIT 1;
    `;
    share = shareRows[0];
  } else {
    const { rows: shareRows } = await sql`
      SELECT * FROM daily_shares WHERE short_id = ${id} LIMIT 1;
    `;
    share = shareRows[0];
  }

  if (!share) return null;

  const dateStr = new Date(share.share_date).toISOString().split('T')[0];

  // 当日の食事ログを取得
  const { rows: logs } = await sql`
    SELECT * FROM meal_logs 
    WHERE user_id = ${share.user_id} 
      AND logged_at::date = ${dateStr}::date
    ORDER BY logged_at ASC;
  `;

  // ユーザーの目標設定を取得
  const { rows: userRows } = await sql`
    SELECT target_calories, target_protein, target_fat, target_carbs
    FROM users WHERE id = ${share.user_id} LIMIT 1;
  `;

  return { share, logs, user: userRows[0] };
}

export async function generateMetadata({ params }: DailySharePageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getDailyData(id);
  if (!data) return { title: "Not Found - LogEats" };

  const totalCal = data.logs.reduce((s, l) => s + l.total_calories, 0);
  const date = new Date(data.share.share_date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  
  const title = `${date} の食事まとめ - LogEats`;
  const description = `今日一日の摂取カロリー: ${Math.round(totalCal)}kcal。AIで食事記録を管理しています。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: `/share/daily/${id}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/share/daily/${id}/opengraph-image`],
    }
  };
}

export default async function DailySharePage({ params }: DailySharePageProps) {
  const { id } = await params;
  const data = await getDailyData(id);
  if (!data) notFound();

  const total = data.logs.reduce((acc, log) => ({
    calories: acc.calories + log.total_calories,
    protein: acc.protein + log.total_protein,
    fat: acc.fat + log.total_fat,
    carbs: acc.carbs + log.total_carbs,
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const target = data.user || { target_calories: 2000, target_protein: 60, target_fat: 50, target_carbs: 250 };

  return (
    <main className="min-h-screen bg-sage-50/30 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white min-h-screen shadow-sm border-x border-sage-100 flex flex-col pb-12">
        <header className="p-6 border-b border-sage-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-bold text-sage-800">LogEats</span>
          </Link>
          <Link href="/" className="btn btn-sm rounded-full bg-sage-800 text-white hover:bg-sage-900 border-none px-4">
            自分も始める
          </Link>
        </header>

        <div className="p-6 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-sage-100 text-sage-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span>📅</span> {new Date(data.share.share_date).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
            </div>
            <h1 className="text-2xl font-black text-sage-900">一日の食事まとめレポート</h1>
          </div>

          {/* Daily Total Summary Card */}
          <div className="bg-gradient-to-br from-sage-800 to-sage-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-sage-300 text-sm font-bold uppercase tracking-widest">Total Calories</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black">{Math.round(total.calories)}</span>
                  <span className="text-sage-400 text-xl font-bold">kcal</span>
                </div>
                {target.target_calories > 0 && (
                  <div className="mt-2 w-full max-w-xs space-y-1.5">
                    <div className="flex justify-between text-[10px] text-sage-300 font-bold uppercase">
                      <span>Goal Progress</span>
                      <span>{Math.round((total.calories / target.target_calories) * 100)}%</span>
                    </div>
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-400 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (total.calories / target.target_calories) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div className="text-center">
                  <p className="text-[10px] text-sage-400 font-bold uppercase mb-1">Protein</p>
                  <p className="text-xl font-bold">{Math.round(total.protein)}<span className="text-[10px] font-normal ml-0.5 text-sage-400">g</span></p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-sage-400 font-bold uppercase mb-1">Fat</p>
                  <p className="text-xl font-bold">{Math.round(total.fat)}<span className="text-[10px] font-normal ml-0.5 text-sage-400">g</span></p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-sage-400 font-bold uppercase mb-1">Carbs</p>
                  <p className="text-xl font-bold">{Math.round(total.carbs)}<span className="text-[10px] font-normal ml-0.5 text-sage-400">g</span></p>
                </div>
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-400/10 rounded-full -ml-12 -mb-12 blur-3xl"></div>
          </div>

          {/* Meal List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-sage-800 flex items-center gap-2">
              <span>🍽️</span> 食べたものリスト ({data.logs.length}件)
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {data.logs.map((log) => {
                const analyzed = typeof log.analyzed_data === "string" ? JSON.parse(log.analyzed_data) : log.analyzed_data;
                const mealEmoji = log.meal_type === "breakfast" ? "🌅" : log.meal_type === "lunch" ? "☀️" : log.meal_type === "dinner" ? "🌙" : "🍪";
                
                return (
                  <div key={log.id} className="flex gap-4 p-4 rounded-2xl border border-sage-100 bg-white hover:border-sage-200 transition-all shadow-sm">
                    {log.image_url ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-sm">
                        <img src={log.image_url} alt="" className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-sage-50 flex items-center justify-center text-2xl shrink-0 border border-sage-100">
                        🍽️
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-sage-400">{mealEmoji} {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="font-bold text-sage-800 truncate">
                        {analyzed.foods?.[0]?.name || "食事記録"}
                        {analyzed.foods?.length > 1 && <span className="ml-1.5 text-xs text-sage-400 font-normal">等 {analyzed.foods.length}点</span>}
                      </div>
                      <div className="text-sm text-sage-600 font-medium">
                        {Math.round(log.total_calories)} <span className="text-[10px] font-normal text-sage-400">kcal</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-auto px-6 py-12">
          <div className="bg-sage-50 rounded-3xl p-8 text-center border-2 border-dashed border-sage-200">
            <span className="text-4xl mb-4 block">🥗</span>
            <h3 className="text-xl font-bold text-sage-800 mb-2">あなたも始めませんか？</h3>
            <p className="text-sm text-sage-500 mb-6 leading-relaxed">
              LogEatsなら写真を撮るだけ。<br />
              AIと一緒に楽しく、スマートに健康管理。
            </p>
            <Link href="/" className="btn bg-sage-800 text-white rounded-full px-8 hover:bg-sage-900 border-none h-12 shadow-md">
              無料で今すぐ解析する
            </Link>
          </div>
        </div>

        <footer className="p-8 text-center text-sage-400 text-xs border-t border-sage-50">
          © {new Date().getFullYear()} LogEats - AI Powered Diet Tracker
        </footer>
      </div>
    </main>
  );
}
