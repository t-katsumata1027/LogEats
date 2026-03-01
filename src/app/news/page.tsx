import { ReleaseNotes } from "@/components/ReleaseNotes";

export const metadata = {
    title: "お知らせ | Log-Eats",
    description: "Log-Eatsの最新のアップデートやお知らせ",
};

export default function NewsPage() {
    return (
        <main className="min-h-screen bg-[#f3f5ef]">
            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-sage-800 mb-6 flex items-center gap-2">
                    <span>📢</span>
                    お知らせ・アップデート情報
                </h1>
                <ReleaseNotes />
            </div>
        </main>
    );
}
