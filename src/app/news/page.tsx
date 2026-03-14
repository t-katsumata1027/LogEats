import { ReleaseNotes } from "@/components/ReleaseNotes";
import Link from "next/link";

export const metadata = {
    title: "お知らせ | Log-Eats",
    description: "Log-Eatsの最新のアップデートやお知らせ",
};

export default function NewsPage() {
    return (
        <main className="min-h-screen bg-[#f3f5ef]">
            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-sage-800 mb-8 flex items-center gap-2">
                    <span>📢</span>
                    お知らせ・記事
                </h1>

                {/* Featured Article */}
                <section className="mb-12">
                    <h2 className="text-sm font-bold text-sage-500 uppercase tracking-wider mb-4 px-1">注目の記事</h2>
                    <Link href="/news/line-integration-story" className="group block bg-white border border-sage-200 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 shadow-sm">
                        <div className="p-6 sm:p-8">
                            <div className="flex gap-2 mb-4">
                                <span className="badge badge-success badge-sm text-white font-bold px-3">開発秘話</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-sage-900 group-hover:text-sage-600 transition-colors mb-3 tracking-tight">
                                【個人開発】LINE連携機能で二重ログインの罠にハマった話
                            </h3>
                            <p className="text-sage-600 text-sm sm:text-base line-clamp-2 mb-6 leading-relaxed">
                                万年ダイエッターが作った食事管理アプリにLINE連携機能をつけたら、二重ログインの罠にハマった話。個人開発の苦労と解決策を公開。
                            </p>
                            <div className="flex items-center text-xs text-sage-400 gap-4 mt-auto">
                                <span className="flex items-center gap-1">📅 2024.03.11</span>
                                <span className="flex items-center gap-1">⏱️ 読了目安: 5分</span>
                            </div>
                        </div>
                    </Link>
                </section>

                <section>
                    <h2 className="text-sm font-bold text-sage-500 uppercase tracking-wider mb-4">アップデート情報</h2>
                    <ReleaseNotes />
                </section>
            </div>
        </main>
    );
}
