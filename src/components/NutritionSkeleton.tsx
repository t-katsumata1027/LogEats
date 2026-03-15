"use client";

export function NutritionSkeleton() {
    return (
        <div className="mt-6 p-6 bg-white rounded-3xl border border-sage-200 shadow-sm animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-sage-100 animate-pulse" />
                <div className="h-6 w-32 bg-sage-100 rounded-md animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 左側: カロリーと円グラフ風プレースホルダー */}
                <div className="flex flex-col items-center justify-center p-6 bg-sage-50/50 rounded-2xl border border-sage-100/50">
                    <div className="relative w-32 h-32 mb-4 bg-white rounded-full border-4 border-sage-100 flex items-center justify-center animate-pulse">
                        <div className="flex flex-col items-center">
                            <div className="h-8 w-16 bg-sage-100 rounded-md mb-1" />
                            <div className="h-3 w-8 bg-sage-50 rounded-md" />
                        </div>
                    </div>
                    <div className="h-4 w-24 bg-sage-100 rounded-md animate-pulse" />
                </div>

                {/* 右側: PFCバランス */}
                <div className="space-y-6 flex flex-col justify-center">
                    {[
                        { label: "P", color: "bg-blue-100" },
                        { label: "F", color: "bg-purple-100" },
                        { label: "C", color: "bg-green-100" }
                    ].map((item) => (
                        <div key={item.label} className="space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center font-bold text-white text-xs animate-pulse`}>
                                        {item.label}
                                    </div>
                                    <div className="h-4 w-16 bg-sage-100 rounded-md animate-pulse" />
                                </div>
                                <div className="h-4 w-12 bg-sage-100 rounded-md animate-pulse" />
                            </div>
                            <div className="w-full bg-sage-100 h-3 rounded-full overflow-hidden">
                                <div className="h-full bg-sage-200 w-1/3 animate-[pulse_2s_ease-in-out_infinite]" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 下部: 食品リストのプレースホルダー */}
            <div className="mt-8 pt-6 border-t border-sage-100">
                <div className="h-5 w-24 bg-sage-100 rounded-md mb-4 animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-sage-50/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-sage-200 animate-pulse" />
                                <div className="h-4 w-32 bg-sage-100 rounded-md animate-pulse" />
                            </div>
                            <div className="h-4 w-16 bg-sage-100 rounded-md animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
