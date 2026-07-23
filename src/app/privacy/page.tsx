import Link from "next/link";

export const metadata = {
    title: "プライバシーポリシー",
    alternates: {
        canonical: "/privacy",
    },
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
                                <li>ユーザーが入力または送信した食事内容等のテキスト</li>
                                <li>ユーザーがアップロードした食事等の画像データ</li>
                                <li>各種認証プロバイダを通じて取得するアカウント情報（メールアドレス、アイコン画像等）</li>
                                <li>閲覧ページ、解析機能の利用成否、滞在時間、広告の表示・クリック等の利用情報</li>
                                <li>IPアドレス、ブラウザ、デバイス情報、Cookieその他の識別子</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第3条（利用目的）</h2>
                            <p className="mb-2">本サービスが収集した情報は、以下の目的で利用します。</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>本サービスにおける画像解析、カロリー計算、栄養素推測の機能提供のため</li>
                                <li>食事記録の保存、表示およびアカウント機能の提供のため</li>
                                <li>利用状況の分析、機能改善、不具合調査および新機能開発のため</li>
                                <li>不正利用の防止、セキュリティ確保および利用規約違反への対応のため</li>
                                <li>広告・アフィリエイト施策の効果測定のため</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第4条（第三者への提供と外部AI連携について）</h2>
                            <p className="mb-2">
                                本サービスでは、解析機能を提供するため、ユーザーから送信された画像またはテキストをGoogleまたはOpenAIが提供するAPIへ送信する場合があります。各事業者におけるデータの取扱いは、それぞれの利用規約およびプライバシーポリシーに従います。
                            </p>
                            <p className="font-bold text-red-600 mb-2">
                                【重要】ユーザーご自身の責任において、アップロードする画像や入力するテキストに個人情報・プライバシーに関する情報が写り込まないよう十分にご注意ください。
                            </p>
                            <p>
                                また、本サービスは認証にClerk、ホスティングおよび利用状況の分析にVercelの各サービス、データ保存にVercel PostgresおよびVercel Blobを使用します。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第5条（アクセス解析ツールについて）</h2>
                            <p className="mb-2">
                                本サービスでは、利用状況の把握および改善のため、Google Analytics、Vercel AnalyticsおよびVercel Speed Insightsを使用します。これらのサービスはCookie等を利用して閲覧情報を収集する場合があります。
                            </p>
                            <p>
                                広告配信を開始した場合はGoogle AdSenseを使用することがあります。また、A8.net、Amazon、楽天等のアフィリエイトリンクを掲載し、表示・クリック・成果に関する情報が各事業者へ送信される場合があります。広告またはアフィリエイトを含むコンテンツには、その旨を分かる位置に表示します。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第6条（保存と削除）</h2>
                            <p className="mb-2">
                                未ログインで利用する画像解析およびテキスト解析では、解析結果を返すために外部AIへ送信しますが、Log-Eatsの食事記録または画像ストレージには保存しません。利用成否等のアクセスログは、個人を直接特定しない形で保存する場合があります。
                            </p>
                            <p className="mb-2">
                                解析から得られた料理名、標準重量、カロリーおよび栄養素等の派生データは、解析精度の改善を目的として、画像、自由入力文、アカウント情報その他のユーザー識別子と分離したfoodDBへ保存する場合があります。
                            </p>
                            <p>
                                ログイン中に登録した食事記録および画像は、サービス提供に必要な期間保存します。削除を希望する場合は、サービス上の削除機能または第8条の窓口から依頼できます。法令上の義務、不正利用調査、バックアップ等の理由により、削除まで一定期間を要する場合があります。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第7条（ポリシーの変更）</h2>
                            <p>
                                運営者は、法令等の変更やサービス内容の変更に応じ、ユーザーに通知することなく本ポリシーを変更することがあります。変更後のポリシーは本ページに掲載された時点から効力を生じます。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-sage-800 mb-3 border-l-4 border-sage-500 pl-3">第8条（お問い合わせ窓口）</h2>
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
                            改定日：2026年7月23日<br />
                            Log-Eats 運営チーム
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
