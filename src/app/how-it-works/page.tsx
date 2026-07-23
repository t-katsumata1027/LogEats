import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "カロリー・PFC推定の仕組みと限界",
  description: "Log-Eatsの食事解析で扱う情報、推定値の限界、データの扱いを説明します。",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "カロリー・PFC推定の仕組みと限界 | Log-Eats",
    description: "食事解析の仕組みと、推定値として扱う際の注意点を説明します。",
    url: "/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-sage-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-medium text-sage-600 hover:text-sage-800">← 無料解析に戻る</Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-sage-900">カロリー・PFC推定の仕組みと限界</h1>
        <p className="mt-4 leading-relaxed text-sage-700">Log-Eatsは、食事の写真または入力された食事内容から、カロリーとPFC（たんぱく質・脂質・炭水化物）の目安を算出します。医療上の診断、治療、個別の栄養指導を目的としたサービスではありません。</p>

        <div className="mt-10 space-y-9 leading-relaxed text-sage-700">
          <section>
            <h2 className="text-xl font-bold text-sage-800">推定の流れ</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>画像またはテキストから料理・食品と量の目安を推定します。</li>
              <li>食品ごとの栄養成分情報と推定量をもとに、カロリーとPFCを計算します。</li>
              <li>結果を目安として表示し、ログイン中の記録は後から確認・修正できます。</li>
            </ol>
          </section>
          <section>
            <h2 className="text-xl font-bold text-sage-800">推定値の限界</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>写真だけでは、重量、油や調味料、隠れた食材、食べ残しを正確に判定できない場合があります。</li>
              <li>同じ料理名でも、レシピ、店舗、盛り付け、調理法によって栄養成分は変わります。</li>
              <li>アレルギー、疾患、妊娠・授乳、治療中の食事管理などは、医師・管理栄養士などの専門家へ相談してください。</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-sage-800">参考にする栄養成分情報</h2>
            <p className="mt-3">食品成分の確認では、文部科学省の日本食品標準成分表（八訂）増補2023年などの公開情報を参照します。実際の食品・製品の表示値と異なる場合があるため、包装の栄養成分表示を優先してください。</p>
            <a className="mt-3 inline-block font-medium text-sage-700 underline hover:text-sage-900" href="https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html?wp_lp=48365" target="_blank" rel="noopener noreferrer">文部科学省: 日本食品標準成分表（八訂）増補2023年</a>
          </section>
          <section>
            <h2 className="text-xl font-bold text-sage-800">更新とお問い合わせ</h2>
            <p className="mt-3">このページは2026年7月24日に更新しました。解析の不自然な結果や掲載内容への問い合わせは、<a className="underline" href="mailto:support@log-eats.com">support@log-eats.com</a>までご連絡ください。</p>
          </section>
        </div>
      </article>
    </main>
  );
}
