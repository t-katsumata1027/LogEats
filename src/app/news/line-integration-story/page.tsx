import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Tag } from "lucide-react";

export const metadata = {
    title: "【個人開発】LINE連携機能で二重ログインの罠にハマった話 | Log-Eats",
    description: "万年ダイエッターが作った食事管理アプリにLINE連携機能をつけたら、二重ログインの罠にハマった話。個人開発の苦労と解決策を公開。",
};

export default function ArticlePage() {
    return (
        <main className="min-h-screen bg-[#f3f5ef] pb-20">
            {/* Navigation Header */}
            <div className="bg-white border-b border-sage-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
                    <Link href="/news" className="flex items-center gap-2 text-sage-600 hover:text-sage-800 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        お知らせ・記事一覧へ
                    </Link>
                </div>
            </div>

            <article className="max-w-3xl mx-auto px-4 py-10">
                {/* Header */}
                <header className="mb-10">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="badge badge-success badge-outline text-[10px] font-bold">開発秘話</span>
                        <span className="badge badge-neutral badge-outline text-[10px] font-bold">LINE連携</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-sage-900 leading-tight mb-6">
                        【個人開発】万年ダイエッターが作った食事管理アプリにLINE連携機能をつけたら、二重ログインの罠にハマった話
                    </h1>
                    <div className="flex items-center gap-4 text-xs text-sage-500">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>2024.03.11</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>読了目安: 5分</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="prose prose-sage max-w-none text-sage-800 leading-relaxed space-y-6">
                    <p className="text-lg text-sage-700">
                        こんにちは！万年ダイエッターのWakuqqaです。
                    </p>
                    <p>
                        前回の記事では、AI食事管理アプリ「Log-Eats（ログイーツ）」を爆誕させたお話をしました。
                        今回は、その<strong>Log-Eatsに「LINE連携」を組み込んだ時の苦労話</strong>を、恥を忍んで（そして面白おかしく）振り返ってみたいと思います。
                    </p>

                    <div className="bg-white border border-sage-200 rounded-2xl p-6 my-8 shadow-sm">
                        <h3 className="text-lg font-bold text-sage-900 mb-2 flex items-center gap-2">
                            <span>ℹ️</span> アプリの概要
                        </h3>
                        <p className="text-sm text-sage-600 mb-4">
                            食事の写真を送るだけで、AIが瞬時にカロリーとPFC（タンパク質・脂質・炭水化物）を計算・記録してくれるアプリです。
                        </p>
                        <Link href="/" className="text-blue-500 underline text-sm font-medium">
                            ブラウザ版はこちら
                        </Link>
                    </div>

                    <h2 className="text-xl font-bold text-sage-900 border-l-4 border-sage-500 pl-4 mt-12 mb-6">
                        🚀 「LINEから写真送れたら最高じゃね？」という甘い誘惑
                    </h2>
                    <p>
                        Log-Eatsを作って数日、自分で使っていてふと思いました。
                        <strong>「毎回ブラウザ開くの、ぶっちゃけ面倒くさいな……」</strong>
                    </p>
                    <p>
                        ダイエットは継続が命。めんどくさがりなダイエッターにとって「ブラウザを開く」という1タップすら高いハードルになります。
                    </p>
                    <p>
                        そこで思いつきました。<strong>「みんな毎日使ってるLINEから直接写真を送れたら、最強のUXになるのでは！？」</strong>
                    </p>
                    <p>
                        AIアシスタントに、「LINE連携したいんだけど」と伝えたところ、「いいですね！やりましょう！」と元気よく返事が。
                        これが、<strong>果てしなく続く「アカウント重複地獄」の入り口</strong>でした。
                    </p>

                    <h2 className="text-xl font-bold text-sage-900 border-l-4 border-sage-500 pl-4 mt-12 mb-6">
                        👿 第一の罠：未ログインユーザーの「とりあえずLINE連携」問題
                    </h2>
                    <p>
                        実装自体は、ClerkのOAuth連携とLINE Messaging APIを使えばプロンプト数発でサクッと終わる……はずでした。
                        意気揚々とトップページに<strong>「LINEで始める / 連携する」</strong>という緑色の眩しいボタンを設置しました。
                    </p>
                    <p>
                        しかし、テストをしていて恐ろしいことに気がつきました。
                        <strong>「あれ、俺の過去のデータどこ行った……？」</strong>
                    </p>
                    <p>
                        そう、実は私はすでにGoogleアカウントでLog-Eatsに登録し、数日分の記録をつけていました。
                        それにもかかわらず、ログアウト状態で「LINEで始める」ボタンを押し、<strong>全くの別アカウント（LINE紐付けの完全新規アカウント）を爆誕させてしまった</strong>のです。
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 my-8">
                        <h3 className="text-amber-800 font-bold mb-2">🛡️ 解決策：UXを損なわない「ワンクッション」</h3>
                        <p className="text-sm text-amber-700">
                            これを防ぐためには、「LINEで始める」ボタンを押した瞬間に、<strong>「君、もしかしてすでにアカウント持ってない？」</strong>と優しく聞いてあげる必要がありました。
                        </p>
                        <p className="text-sm text-amber-700 mt-2">
                            既存ユーザーにはログインを促し、設定画面から連携してもらう。完全新規の人はそのままLINE登録へ。
                            この「ちょっと待ってコール」を挟むことで、データの分散という大惨事を未然に防ぐことができました。
                        </p>
                    </div>

                    <h2 className="text-xl font-bold text-sage-900 border-l-4 border-sage-500 pl-4 mt-12 mb-6">
                        👿 第二の罠：Webhookからの「お前誰やねん」問題
                    </h2>
                    <p>
                        LINE Bot側に写真を送った時の挙動も一筋縄ではいきませんでした。
                        LINEから画像がWebhookで飛んできた時、私たちのサーバーは<strong>「このLINEユーザーID、データベースのどのユーザーと紐付いてるんだっけ？」</strong>を探す必要があります。
                    </p>
                    <p>
                        ClerkのWebhookを使ってDB側にline_user_idを保存する処理を書きましたが、最初はエラー頻発。
                        原因は署名検証のトラブルや、非同期処理でのタイムアウトなど様々でした。
                    </p>

                    <h2 className="text-xl font-bold text-sage-900 border-l-4 border-sage-500 pl-4 mt-12 mb-6">
                        🎉 パワーアップしたLog-Eats
                    </h2>
                    <p>
                        数々の罠を乗り越え、ついに「いつものLINEから写真を送るだけで食事記録が完了する」という最強の体験を手に入れました。
                    </p>
                    <p>
                        「バイブコーディング（AIとの対話型開発）」は便利ですが、既存のシステムと外部サービスをセキュアに結びつける実装では、人間側の<strong>「こういう落とし穴があるかも？」という想像力と要件定義</strong>が重要だなと痛感しました。
                    </p>
                    <p>
                        これからも、自分が「めんどくさい」と思ったことを解消するために、Log-Eatsを育てていこうと思います。
                        ぜひ一度、進化した<Link href="/" className="text-blue-500 underline">Log-Eats</Link>と、そのLINE機能を試してみてくださいね！
                    </p>
                </div>

                {/* Footer of the article */}
                <footer className="mt-16 pt-8 border-t border-sage-200">
                    <Link href="/news" className="btn btn-outline btn-block border-sage-300 text-sage-700 rounded-full hover:bg-sage-50">
                        記事一覧に戻る
                    </Link>
                </footer>
            </article>
        </main>
    );
}
