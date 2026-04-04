import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { NutritionResult } from "@/components/NutritionResult";
import { Metadata } from "next";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

async function getMealLog(uuid: string) {
  const { rows } = await sql`
    SELECT * FROM meal_logs WHERE share_id = ${uuid} LIMIT 1;
  `;
  return rows[0];
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  // URLにテキストが混入した場合を考慮し、最初のUUID部分(36文字)のみを抽出
  const uuid = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || id;
  const log = await getMealLog(uuid);

  if (!log) return { title: "Not Found - LogEats" };

  const title = `今日の食事解析結果 - LogEats`;
  const description = `${log.total_calories}kcal | P:${log.total_protein}g F:${log.total_fat}g C:${log.total_carbs}g | AIが写真を一瞬で解析しました。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: `/share/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "食事解析レポート",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/share/${id}/opengraph-image`],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  // URLにテキストが混入した場合を考慮し、最初のUUID部分(36文字)のみを抽出
  const uuid = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || id;
  const log = await getMealLog(uuid);

  if (!log) {
    notFound();
  }

  const analyzedData = typeof log.analyzed_data === "string" 
    ? JSON.parse(log.analyzed_data) 
    : log.analyzed_data;
  
  const foods = analyzedData.foods || [];
  const summary = {
    totalCalories: log.total_calories,
    totalProtein: log.total_protein,
    totalFat: log.total_fat,
    totalCarbs: log.total_carbs,
  };

  return (
    <main className="min-h-screen bg-sage-50/30 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white min-h-screen shadow-sm border-x border-sage-100 flex flex-col">
        {/* Header Branding */}
        <header className="p-6 border-b border-sage-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-bold text-sage-800 tracking-tight">LogEats</span>
          </Link>
          <Link 
            href="/" 
            className="text-sm font-medium text-sage-600 bg-sage-50 px-4 py-2 rounded-full hover:bg-sage-100 transition-colors"
          >
            自分も試してみる
          </Link>
        </header>

        <div className="p-4 sm:p-6 flex-1">
          {/* Meal Image */}
          {log.image_url && (
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-md mb-6 bg-sage-100 border border-sage-200">
              <Image
                src={log.image_url}
                alt="食事の写真"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
                priority
              />
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white bg-sage-400 px-2 py-0.5 rounded uppercase tracking-wider">
                Public Report
              </span>
              <span className="text-xs text-sage-500">
                {new Date(log.logged_at || log.created_at).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-sage-800">食事解析レポート</h1>
          </div>

          <NutritionResult 
            foods={foods} 
            summary={summary} 
            isLoggedIn={false} 
          />

          <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-sage-800 to-sage-900 text-white text-center shadow-lg">
            <h2 className="text-xl font-bold mb-3">あなたも今日の食事を解析してみませんか？</h2>
            <p className="text-sage-200 text-sm mb-6 leading-relaxed">
              LogEatsなら写真を撮るだけでAIが瞬時に栄養素を推計。<br className="hidden sm:inline" />
              毎日の健康管理をもっと楽しく、カンタンに。
            </p>
            <Link 
              href="/" 
              className="inline-block bg-white text-sage-900 font-bold px-8 py-3 rounded-full hover:bg-sage-50 transition-all transform hover:scale-105"
            >
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
