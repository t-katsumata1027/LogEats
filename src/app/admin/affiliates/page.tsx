"use client";

import { useState, useEffect } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";

type Banner = {
    id: number;
    name: string;
    html_content: string;
    is_active: boolean;
    created_at: string;
};

export default function AdminAffiliatesPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [newName, setNewName] = useState("");
    const [newHtmlContent, setNewHtmlContent] = useState("");

    const fetchBanners = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/affiliates");
            if (res.ok) {
                const data = await res.json();
                setBanners(data.banners || []);
            }
        } catch (error) {
            console.error("Failed to fetch banners", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newHtmlContent.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/affiliates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    html_content: newHtmlContent,
                }),
            });

            if (res.ok) {
                setNewName("");
                setNewHtmlContent("");
                fetchBanners();
            } else {
                alert("登録に失敗しました");
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("本当に削除しますか？")) return;

        try {
            const res = await fetch(`/api/admin/affiliates/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setBanners((prev) => prev.filter((b) => b.id !== id));
            } else {
                alert("削除に失敗しました");
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                📢 アフィリエイト広告管理
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 新規登録フォーム - 1/3幅 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 h-fit">
                    <h3 className="text-lg font-bold text-sage-800 mb-4 flex items-center gap-2">
                        <Plus size={20} />
                        新規追加
                    </h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-bold text-sage-700 text-xs">商材・プログラム名</span>
                            </label>
                            <input
                                type="text"
                                className="input input-sm input-bordered bg-white w-full"
                                placeholder="例: 〇〇サプリ A8.net"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                disabled={isSubmitting || isLoading}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-bold text-sage-700 text-xs">ASP提供のHTMLタグ（コピペ）</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered bg-white text-xs w-full min-h-[150px] font-mono leading-relaxed"
                                placeholder={`<a href="...">\n  <img src="...">\n</a>`}
                                value={newHtmlContent}
                                onChange={(e) => setNewHtmlContent(e.target.value)}
                                disabled={isSubmitting || isLoading}
                            />
                            <label className="label pt-1 pb-0">
                                <span className="label-text-alt text-sage-400">※ タグの改変はASP規約違反になるためそのまま貼り付けてください</span>
                            </label>
                        </div>
                        <button
                            type="submit"
                            className="btn bg-sage-600 hover:bg-sage-700 text-white w-full border-none shadow-sm"
                            disabled={!newName.trim() || !newHtmlContent.trim() || isSubmitting || isLoading}
                        >
                            {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "登録する"}
                        </button>
                    </form>
                </div>

                {/* 登録済みリスト - 2/3幅 */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-sage-800">登録済み広告リスト</h3>
                    
                    {isLoading ? (
                        <div className="flex justify-center p-8 bg-white rounded-2xl border border-sage-100">
                            <span className="loading loading-spinner loading-md text-sage-400"></span>
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-sage-100 text-center text-sage-500">
                            登録されている広告はありません。<br />
                            左のフォームからASPのタグを登録してください。
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {banners.map((banner) => (
                                <div key={banner.id} className="bg-white rounded-2xl shadow-sm border border-sage-200 overflow-hidden flex flex-col">
                                    <div className="p-3 bg-sage-50 border-b border-sage-200 flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sage-800 text-sm break-all">{banner.name}</h4>
                                            <p className="text-[10px] text-sage-500 mt-1">
                                                追加日: {new Date(banner.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(banner.id)}
                                            className="btn btn-xs btn-circle btn-ghost text-red-500 hover:bg-red-50 ml-2 shrink-0" 
                                            title="削除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="p-4 flex-1 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/50">
                                        <div 
                                            // The preview area
                                            dangerouslySetInnerHTML={{ __html: banner.html_content }}
                                            className="[&>a>img]:w-full [&>a>img]:max-w-[250px] [&>a>img]:h-auto [&>a]:block flex flex-col justify-center scale-90 text-center text-sm font-medium text-sage-800 break-words [&>a]:hover:underline"
                                        />
                                    </div>
                                    <div className="p-2 border-t border-sage-100 bg-sage-50/30 text-center">
                                        <p className="text-[10px] text-sage-400">
                                            ※ アプリ側ではランダムに1つが選ばれて表示されます
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
