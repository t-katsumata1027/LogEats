import Link from "next/link";

export const metadata = {
    title: "プライバシーポリシー",
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen pt-12 pb-16 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-sage-600 hover:text-sage-800 transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-sage-200 shadow-sm">
                        <span className="mr-2">←</span> アプリに戻る
                    </Link>
                </div>

                <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-sage-200">
                    <h1 className="text-3xl font-extrabold text-sage-900 tracking-tight mb-8">プライバシーポリシー</h1>

                    <div className="space-y-8 text-sage-700 leading-relaxed text-sm sm:text-base">
                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第1条（はじめに）</h2>
                            <p>
                                AI食事管理アプリ「Log-Eats」（以下「本サービス」といいます。）は、本サービスにおけるユーザーの個人情報および関連するデータの取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。本サービスは**実験的な取り組み**であり、データの取り扱いについてもこの前提の下に行われます。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第2条（収集する情報）</h2>
                            <p className="mb-2">本サービスは、以下の情報を収集する場合があります。</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>ユーザーが入力または送信したテキスト・プロンプト・会話履歴</li>
                                <li>ユーザーがアップロードした食事等の画像データ</li>
                                <li>各種認証プロバイダを通じて取得するアカウント情報（メールアドレス、アイコン画像等）</li>
                                <li>アクセスログ、デバイス情報、Cookie等</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第3条（情報利用の目的とAI学習への同意）</h2>
                            <p className="mb-2">本サービスが収集したデータは、以下の目的で利用されます。ユーザーは本サービスを利用することで、この利用目的に**強く同意**するものとします。</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>本サービスにおける画像解析、カロリー計算、栄養素推測の機能提供のため</li>
                                <li>**AIモデル・アルゴリズムの学習、再学習、精度向上のための利用（実験的な学習データとしての利用を含みます）**</li>
                                <li>本サービスの利便性向上および新機能開発のため</li>
                                <li>利用規約に違反する行為への対応のため</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第4条（第三者への提供と外部AI連携について）</h2>
                            <p className="mb-2">
                                本サービスでは、解析機能を提供するために、ユーザーから送信された画像およびテキストデータを**外部のAIプロバイダ（OpenAI社・Anthropic社等）のAPIエンドポイントへ送信**します。
                            </p>
                            <p className="font-bold text-red-600 mb-2">
                                【重要】ユーザーご自身の責任において、アップロードする画像や入力するテキストに個人情報・プライバシーに関する情報が写り込まないよう十分にご注意ください。
                            </p>
                            <p>
                                万が一、アップロードされたデータに個人情報が含まれていた場合でも、システムは判別することなく外部APIへ送信および学習用データとして保存する可能性があります。これにより発生した事故や不利益について、運営者は**一切の責任を負いません。**
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第5条（アクセス解析ツールについて）</h2>
                            <p>
                                本サービスでは、利用状況の把握のためにVercel Analytics等のアクセス解析ツールを使用しています。これらはCookieを使用し、個人を特定しない形でトラフィックデータを収集しています。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第6条（ポリシーの変更）</h2>
                            <p>
                                運営者は、法令等の変更やサービス内容の変更に応じ、ユーザーに通知することなく本ポリシーを変更することがあります。変更後のポリシーは本ページに掲載された時点から効力を生じます。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第7条（お問い合わせ窓口）</h2>
                            <p className="mb-2">
                                本ポリシーに関するお問い合わせ、または個人情報の取り扱いに関するご相談につきましては、下記の窓口までお願いいたします。
                            </p>
                            <div className="bg-sage-50 p-4 rounded-lg border border-sage-200">
                                <p className="font-bold text-sage-800 mb-1">Log-Eats お問い合わせ窓口</p>
                                <p>
                                    <span className="text-sage-600 w-16 inline-block">Email:</span>
                                    <a href="mailto:support@log-eats.com" className="text-sage-800 hover:text-sage-600 underline">support@log-eats.com</a>
                                </p>
                            </div>
                        </section>
                    </div>
                    <section>
                        <p className="text-right text-sm text-sage-500 mt-12">
                            制定日：2026年2月27日<br />
                            Log-Eats 運営チーム
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
