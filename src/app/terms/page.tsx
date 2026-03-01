import Link from "next/link";

export const metadata = {
    title: "利用規約",
};

export default function TermsPage() {
    return (
        <main className="min-h-screen pt-12 pb-16 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-sage-600 hover:text-sage-800 transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-sage-200 shadow-sm">
                        <span className="mr-2">←</span> アプリに戻る
                    </Link>
                </div>

                <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-sage-200">
                    <h1 className="text-3xl font-extrabold text-sage-900 tracking-tight mb-8">利用規約</h1>

                    <div className="space-y-8 text-sage-700 leading-relaxed text-sm sm:text-base">
                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第1条（はじめに）</h2>
                            <p className="mb-2">
                                本利用規約（以下「本規約」といいます。）は、提供者（以下「運営者」といいます。）が提供するAI食事管理アプリ「Log-Eats」（以下「本サービス」といいます。）の利用条件を定めるものです。
                            </p>
                            <p>
                                本サービスは**実験的な取り組み**として提供されるものであり、商用グレードの可用性や正確性を保証するものではありません。ユーザーは本規約に同意した上で、本サービスを利用するものとします。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第2条（免責事項）</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>運営者は、本サービスが提供する解析結果（カロリー、栄養素等の計算結果を含みますがこれに限られません）の正確性、完全性、有用性、および医療的または健康管理上の妥当性について、**一切の保証を行いません**。</li>
                                <li>本サービスの解析結果はあくまで推測値であり、医療行為や専門的な栄養指導の代替となるものではありません。本サービスの利用によりユーザーに生じた健康上の問題、損害、不利益について、運営者は一切の責任を負わないものとします。</li>
                                <li>本サービスは事前の通知なく仕様の変更、停止、または終了される場合があります。これにより生じた損害について、運営者は一切の責任を負いません。</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第3条（アップロードされるデータとユーザーの責任）</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>ユーザーは、本サービスに画像またはテキストをアップロード・入力する際、自身または第三者の**個人情報（顔写真、氏名、住所、連絡先等のプライバシーに関わる一切の情報）を含めない**ことに同意するものとします。</li>
                                <li>万が一、ユーザーがアップロードした画像または入力したテキストに個人情報が含まれていた場合であっても、運営者はそれに気付かずシステムが自動処理（保存、解析、学習データへの利用等）を行う可能性があります。これによって生じたプライバシー侵害等のいかなる結果・損害についても、**運営者は一切の責任を負わないものとします**。</li>
                                <li>ユーザーが他者の権利（著作権、肖像権等）を侵害するデータをアップロードした場合、ユーザーは自己の責任と費用においてこれを解決するものとし、運営者を免責するものとします。</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第4条（AI学習データの利用に関する同意）</h2>
                            <p className="mb-2">
                                ユーザーは、本サービスに入力したテキスト、アップロードされた画像、およびそれらの解析結果等のデータが、以下の目的で利用されることに**明示的に同意**するものとします。
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>本サービスの提供および品質向上</li>
                                <li>本サービスまたは第三者の機械学習モデル・AIアルゴリズムの構築、訓練、改善（実験的利用を含む）</li>
                                <li>学術研究または統計データの作成</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第5条（規約の変更）</h2>
                            <p>
                                運営者は、必要と判断した場合には、ユーザーに通知することなく本規約を変更することができるものとします。変更後の本規約は、本ページに掲載された時点で効力を生じるものとします。
                            </p>
                        </section>

                        <section>
                            <p className="text-right text-sm text-sage-500 mt-12">
                                制定日：2026年2月27日<br />
                                Log-Eats 運営チーム
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
