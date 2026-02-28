import React from 'react';

export function ReleaseNotes() {
    return (
        <div className="mb-20">
            <h3 className="text-2xl font-bold text-sage-800 text-center mb-8 flex justify-center items-center gap-2 tracking-tight">
                <span>🚀</span> 最近のアップデート
            </h3>
            <div className="max-w-xl mx-auto space-y-4">
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" defaultChecked />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-success badge-sm text-white">New</span>
                        <span>v1.3: トップページからのお試し解析とスマホ対応</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>未ログイン状態のトップページからでも、写真だけでなくテキスト入力による食事AI解析をお試しできるようになりました。また、スマートフォンでの解析結果表示（テーブルの横スクロール）をカード形式に改善し、より見やすくなりました。</p>
                    </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-neutral badge-sm text-white">v1.2</span>
                        <span>栄養素の目標許容幅を設定可能に</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>カロリーやPFC（タンパク質・脂質・炭水化物）の目標値に対して、**「±〇〇%以内なら達成とする」**という許容幅が設定できるようになりました。ぴったり合わせるのが難しい目標も、自分に合った幅で無理なく管理できます。</p>
                    </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-neutral badge-sm text-white">v1.1</span>
                        <span>写真がなくても文章で記録可能に</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>写真を撮り忘れても大丈夫！「ざるそば1枚と唐揚げ2個」のように**テキストを入力するだけ**で、AIが内容を読み取り、カロリーと栄養素を自動計算して記録します。</p>
                    </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-neutral badge-sm text-white">v1.0</span>
                        <span>週次グラフ＆カレンダーでの進捗管理</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>ダッシュボードに過去1週間の摂取カロリーとPFCの推移グラフを追加しました。目標を達成した日にはカレンダーに「⭐」バッジがつき、毎日のモチベーション維持に役立ちます。</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
