import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-sage-900 text-sage-200 py-8 text-center text-sm border-t border-sage-800">
            <div className="max-w-2xl mx-auto px-4">
                <p className="mb-2 font-bold text-sage-100 items-center justify-center flex gap-2">
                    🍽️ Log-Eats
                </p>
                <p className="text-xs opacity-80 mb-6 flex flex-col sm:flex-row items-center justify-center gap-1">
                    <span>毎日の食事を、AIで賢く記録する</span>
                    <span className="hidden sm:inline">|</span>
                    <span>AI-powered meal tracking</span>
                </p>
                <div className="flex justify-center gap-4 text-xs opacity-60">
                    <Link href="/news" className="hover:text-white transition-colors">お知らせ / 記事</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
                    <Link href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
                    <a href="mailto:support@log-eats.com" className="hover:text-white transition-colors">お問い合わせ</a>
                </div>
                <div className="mt-8 text-[10px] opacity-40">
                    &copy; {new Date().getFullYear()} Log-Eats. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
