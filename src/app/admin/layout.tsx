import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, FileText, AlertTriangle, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!session?.user?.email || session.user.email !== adminEmail) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-sage-50 text-sage-900 pb-20 md:pb-0 z-[100] relative">
            {/* Header */}
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center z-10 sticky top-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-clay to-mocha text-transparent bg-clip-text">Log-Eats Admin</h1>
                <Link href="/" className="btn btn-ghost btn-sm text-sage-600 gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    アプリへ戻る
                </Link>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-64px)] hidden md:block">
                    <nav className="p-4 space-y-2 sticky top-[80px]">
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sage-100 text-sage-700 transition-colors">
                            <LayoutDashboard className="w-5 h-5" />
                            <span>ダッシュボード</span>
                        </Link>
                        <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sage-100 text-sage-700 transition-colors">
                            <Users className="w-5 h-5" />
                            <span>ユーザー管理</span>
                        </Link>
                        <Link href="/admin/logs" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sage-100 text-sage-700 transition-colors">
                            <FileText className="w-5 h-5" />
                            <span>食事記録</span>
                        </Link>
                        <Link href="/admin/errors" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sage-100 text-red-600 transition-colors">
                            <AlertTriangle className="w-5 h-5" />
                            <span>エラーログ</span>
                        </Link>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav for Admin */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sage-200 flex justify-around p-2 z-50">
                <Link href="/admin" className="flex flex-col items-center p-2 text-sage-600">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-[10px] mt-1">ホーム</span>
                </Link>
                <Link href="/admin/users" className="flex flex-col items-center p-2 text-sage-600">
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] mt-1">ユーザー</span>
                </Link>
                <Link href="/admin/logs" className="flex flex-col items-center p-2 text-sage-600">
                    <FileText className="w-5 h-5" />
                    <span className="text-[10px] mt-1">記録</span>
                </Link>
                <Link href="/admin/errors" className="flex flex-col items-center p-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-[10px] mt-1">エラー</span>
                </Link>
            </div>
        </div>
    );
}
