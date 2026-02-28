import { HeaderNav } from "@/components/HeaderNav";
import { CustomUserButton } from "@/components/CustomUserButton";
import { ReleaseNotes } from "@/components/ReleaseNotes";

export const metadata = {
    title: "お知らせ | Log-Eats",
    description: "Log-Eatsの最新のアップデートやお知らせ",
};

export default function NewsPage() {
    return (
        <main className="min-h-screen bg-[#f3f5ef]">
            {/* Header */}
            <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-xl font-semibold text-sage-800 tracking-tight">
                            Log-Eats
                        </div>
                        <p className="text-xs sm:text-sm text-sage-600 mt-1 leading-snug">
                            最新のアップデートやお知らせ
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <HeaderNav />
                        <div className="flex items-center gap-2 sm:gap-3">
                            <CustomUserButton />
                        </div>
                    </div>
                </div>
            </header>

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
