"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function useAddToHome() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [installed, setInstalled] = useState(false);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        setIsStandalone(standalone);

        const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
        setIsIOS(ios);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setDeferredPrompt(null);
        } else {
            setShowHint((prev) => !prev);
        }
    };

    const hidden = isStandalone || installed;

    return { hidden, isIOS, showHint, setShowHint, handleInstall };
}

/** ヒントポップアップ（内部用） */
function HintPopup({
    isIOS,
    onClose,
    position = "above",
}: {
    isIOS: boolean;
    onClose: () => void;
    position?: "above" | "below";
}) {
    const posClass = position === "above" ? "bottom-full mb-2" : "top-full mt-2";
    return (
        <div
            className={`absolute left-1/2 -translate-x-1/2 ${posClass} z-50 w-72 rounded-2xl bg-white shadow-2xl border border-sage-100 p-4 text-xs text-sage-700 leading-relaxed`}
        >
            {isIOS ? (
                <>
                    <p className="font-semibold text-sage-800 mb-2">🍎 iOSの場合</p>
                    <ol className="space-y-1.5 list-decimal list-inside">
                        <li>Safari下部の <span className="font-bold">共有ボタン（□↑）</span> をタップ</li>
                        <li>「<span className="font-bold">ホーム画面に追加</span>」を選択</li>
                        <li>右上の「追加」をタップして完了</li>
                    </ol>
                </>
            ) : (
                <>
                    <p className="font-semibold text-sage-800 mb-2">💻 ブラウザの場合</p>
                    <ol className="space-y-1.5 list-decimal list-inside">
                        <li>アドレスバー右端の <span className="font-bold">インストールアイコン（⊕）</span> をクリック</li>
                        <li>または ブラウザメニュー →「<span className="font-bold">Log-Eats をインストール</span>」を選択</li>
                    </ol>
                </>
            )}
            <button
                onClick={onClose}
                className="mt-3 w-full text-center text-sage-400 hover:text-sage-600 transition-colors"
            >
                閉じる
            </button>
        </div>
    );
}

/** ① ヘッダー用: アイコンボタン（小） */
export function AddToHomeScreen() {
    const { hidden, isIOS, showHint, setShowHint, handleInstall } = useAddToHome();
    if (hidden) return null;

    return (
        <div className="relative">
            <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
          bg-sage-50 border border-sage-200 text-sage-700
          hover:bg-sage-100 hover:border-sage-300 transition-all duration-200
          shadow-sm active:scale-95"
                aria-label="ホーム画面に追加"
            >
                <span className="text-base leading-none">📲</span>
                <span className="hidden sm:inline">ホームに追加</span>
            </button>
            {showHint && (
                <HintPopup isIOS={isIOS} onClose={() => setShowHint(false)} position="below" />
            )}
        </div>
    );
}

/** ② インラインカード: ヒーローセクション等に埋め込む */
export function AddToHomeInlineCard() {
    const { hidden, isIOS, showHint, setShowHint, handleInstall } = useAddToHome();
    if (hidden) return null;

    return (
        <div className="relative w-full max-w-sm mx-auto mt-4">
            <div className="flex items-center gap-3 bg-sage-50 border border-sage-200 rounded-2xl px-4 py-3 shadow-sm">
                <span className="text-2xl shrink-0">📲</span>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-sage-800 leading-tight">
                        ホーム画面に追加して、もっと便利に！
                    </p>
                    <p className="text-[11px] text-sage-500 mt-0.5 leading-tight">
                        アプリのように使えます
                    </p>
                </div>
                <button
                    onClick={handleInstall}
                    className="shrink-0 text-xs font-bold text-white bg-sage-600 hover:bg-sage-700
            px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
                >
                    追加する
                </button>
            </div>
            {showHint && (
                <HintPopup isIOS={isIOS} onClose={() => setShowHint(false)} position="below" />
            )}
        </div>
    );
}

/** ③ 固定バナー: 画面下に常時表示（スマホ向け） */
export function AddToHomeBanner() {
    const { hidden, isIOS, showHint, setShowHint, handleInstall } = useAddToHome();
    const [dismissed, setDismissed] = useState(false);

    if (hidden || dismissed) return null;

    return (
        <>
            {/* オーバーレイ（ヒント表示中） */}
            {showHint && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowHint(false)}
                />
            )}

            {/* バナー本体 */}
            <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
                <div className="relative mx-3 mb-3">
                    {/* ヒントポップアップ */}
                    {showHint && (
                        <HintPopup isIOS={isIOS} onClose={() => setShowHint(false)} position="above" />
                    )}

                    <div className="flex items-center gap-3 bg-white border border-sage-200 rounded-2xl px-4 py-3 shadow-lg">
                        <span className="text-2xl shrink-0">�</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-sage-800 leading-tight">
                                ホーム画面に追加しよう！
                            </p>
                            <p className="text-[11px] text-sage-500 mt-0.5 leading-tight">
                                いつでもすぐに起動できます
                            </p>
                        </div>
                        <button
                            onClick={handleInstall}
                            className="shrink-0 text-xs font-bold text-white bg-sage-600 hover:bg-sage-700
                px-3 py-2 rounded-xl transition-all duration-200 active:scale-95 shadow-sm whitespace-nowrap"
                        >
                            追加する
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className="shrink-0 text-sage-400 hover:text-sage-600 text-lg leading-none transition-colors"
                            aria-label="閉じる"
                        >
                            ×
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
