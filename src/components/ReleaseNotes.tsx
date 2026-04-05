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
                        <span>v1.7: SNSシェア機能の大幅強化！𝕏 🚀</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>「どんなものを食べたか」「今日の目標を達成できたか」を、美しく簡単にSNSで共有できるようになりました！開発者自身も感じていた「手動投稿の面倒くささ」を、ボタン一つで解消します。🚀</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-1 text-xs">
                            <li><strong>𝕏 (X) 専用シェアボタン</strong>: 解析結果や履歴詳細から、ブランドロゴ入りのボタンでワンタップ投稿。</li>
                            <li><strong>1日のまとめレポート</strong>: 今日一日の合計摂取量と目標達成度を、専用の特設ページでグラフと共に公開できます。</li>
                            <li><strong>動的画像（OGP）生成</strong>: シェアURLを貼り付けると、解析数値や写真が合成された「今の成果」が伝わる画像が自動で表示されます。</li>
                            <li><strong>URL短縮対応</strong>: シェアURLを `/s/xxxx` という短い形式に。SNSでの見栄えを最適化しました。</li>
                        </ul>
                    </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-neutral badge-sm text-white">v1.6</span>
                        <span>チャット体験の向上と目標計算ツールの導入 🛠️</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>より使いやすく、より楽しく食事管理ができるよう、大幅なUI/UXアップデートを実施しました！</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-1 text-xs">
                            <li><strong>没入感のある記録画面</strong>: スマホ表示時にチャット領域を最大限に広げ、アプリのような使い心地を実現しました。</li>
                            <li><strong>解析中のワクワク感を演出</strong>: AIが解析を行っている間、結果エリアに「スケルトン表示」を追加し、解析状況を視覚的に分かりやすくしました。</li>
                            <li><strong>目標自動計算ツール</strong>: トップページに、身体情報から自分に最適なPFCバランスを即座に算出できるシミュレーターを設置しました。</li>
                            <li><strong>SEO・表示の最適化</strong>: 検索からのアクセスのしやすさや、トップページの読みやすさを改善しました。</li>
                        </ul>
                    </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-neutral badge-sm text-white">v1.5</span>
                        <span>LINE公式アカウントとの連携開始 🟢</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>LogEats公式LINEアカウントと連携できるようになりました！わざわざブラウザを開かなくても、いつものLINE画面から食事の写真を送るだけで直接記録できます。</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-1 text-xs">
                            <li>未連携の場合は、トップページの「LINEで始める / 連携する」からアカウント作成・連携が可能です。</li>
                            <li>すでにログイン中の方は、設定画面の「外部サービス連携」から簡単に連携＆LINE友だち追加ができます。</li>
                            <li>もちろんテキストでの記録にも対応。毎日の記録がさらにスムーズに！</li>
                        </ul>
                    </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-neutral badge-sm text-white">v1.4</span>
                        <span>まるでLINEのようなチャット記録UI ✨</span>
                    </div>
                    <div className="collapse-content text-sage-600 text-sm leading-relaxed space-y-2">
                        <p>記録画面が大きく進化しました！AIアシスタントとのチャット形式で、自然なやり取りをしながら食事記録ができるようになりました。</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-1 text-xs">
                            <li>写真やテキストを送ると、AIがフレンドリーに返答します。</li>
                            <li>時間帯（朝・昼・夜）によってAIからの労いの言葉が変わります。</li>
                            <li>チャット画面で直近2日間の自分の送信履歴（写真・テキスト）が確認できます。</li>
                            <li>メニューから過去の「お知らせ」もいつでも見返せるようになりました。</li>
                        </ul>
                    </div>
                </div>
                <div className="collapse collapse-plus bg-white border border-sage-100 shadow-sm hover:shadow-md transition-shadow">
                    <input type="radio" name="release-notes" />
                    <div className="collapse-title text-base sm:text-lg font-bold text-sage-800 flex items-center gap-3">
                        <span className="badge badge-neutral badge-sm text-white">v1.3</span>
                        <span>トップページからのお試し解析とスマホ対応</span>
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
