"use client";

import { useState } from "react";

interface LineConnectionSettingsProps {
  isConnected: boolean;
}

export function LineConnectionSettings({ isConnected: initialIsConnected }: LineConnectionSettingsProps) {
  const [isConnected, setIsConnected] = useState(initialIsConnected);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const lineConnectUrl =
    process.env.NEXT_PUBLIC_LINE_CONNECT_URL ||
    process.env.NEXT_PUBLIC_LINE_FRIEND_URL ||
    "";

  const handleUnlink = async () => {
    const confirmed = window.confirm(
      "LINE連携を解除しますか？\n※解除後も過去の食事記録は削除されません。"
    );
    if (!confirmed) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/line/account-link", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "連携の解除に失敗しました");
      }

      setIsConnected(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-sage-100 shadow-sm mt-8">
      <h3 className="text-lg font-bold text-sage-800 mb-4 flex items-center gap-2">
        <span>🔌</span> 外部サービス連携 (LINE)
      </h3>

      <p className="text-sm text-sage-600 mb-6 leading-relaxed">
        LINEと連携すると、LogEatsの公式LINEアカウントから食事の写真を送るだけで、簡単にカロリーとPFCバランスを記録できるようになります。
      </p>

      {errorMsg && (
        <div className="alert alert-error text-sm text-red-800 bg-red-50 border-red-200 mb-4 py-2">
          <span>❌ {errorMsg}</span>
        </div>
      )}

      {isConnected ? (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#06C755] text-white p-2 rounded-full">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.9 8.847 9.284 9.546.362.078.853.238.977.544.112.277.072.712.034.99l-.26 1.564c-.05.297-.241.947.838.492 1.078-.455 5.823-3.419 8.016-5.91 2.053-2.316 3.111-4.697 3.111-7.227zm-14.453 3.012h-2.585c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h2.585c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486zm3.328 0h-.972c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h.972c.27 0 .486.216.486.486v5.17c0 .27-.216.486-.486.486zm5.83-3.493l-2.001-2.029c-.198-.2-.524-.204-.724-.007s-.205.524-.007.724l1.134 1.15H14.15c-.27 0-.486.216-.486.486v3.295c0 .27.216.486.486.486h.842c.27 0 .486-.216.486-.486v-2.809h1.127l-1.135 1.15c-.198.2-.193.526.007.724.099.098.229.147.359.147.135 0 .27-.052.371-.155l2.001-2.029c.2-.203.2-.533 0-.736z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-emerald-800">LINE連携済みです</p>
              <p className="text-xs text-emerald-600">LINEから送った写真は自動保存されます</p>
            </div>
          </div>

          <button
            onClick={handleUnlink}
            disabled={isLoading}
            className="btn btn-sm btn-outline border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-lg"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs text-red-600"></span>
            ) : (
              "連携を解除する"
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center sm:items-start gap-4">
          <p className="text-xs text-sage-600 font-medium">
            💡 公式LINEを開き、トーク画面で<span className="font-bold text-emerald-600">「連携」</span>と送信してください。
          </p>

          {lineConnectUrl ? (
            <a
              href={lineConnectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#06C755] hover:bg-[#05b34c] text-white border-none rounded-xl font-bold px-6 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.9 8.847 9.284 9.546.362.078.853.238.977.544.112.277.072.712.034.99l-.26 1.564c-.05.297-.241.947.838.492 1.078-.455 5.823-3.419 8.016-5.91 2.053-2.316 3.111-4.697 3.111-7.227zm-14.453 3.012h-2.585c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h2.585c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486zm3.328 0h-.972c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h.972c.27 0 .486.216.486.486v5.17c0 .27-.216.486-.486.486zm5.83-3.493l-2.001-2.029c-.198-.2-.524-.204-.724-.007s-.205.524-.007.724l1.134 1.15H14.15c-.27 0-.486.216-.486.486v3.295c0 .27.216.486.486.486h.842c.27 0 .486-.216.486-.486v-2.809h1.127l-1.135 1.15c-.198.2-.193.526.007.724.099.098.229.147.359.147.135 0 .27-.052.371-.155l2.001-2.029c.2-.203.2-.533 0-.736z"/>
              </svg>
              LINE連携を始める
            </a>
          ) : (
            <button
              disabled
              className="btn btn-disabled bg-gray-200 text-gray-400 border-none rounded-xl font-bold px-6 w-full sm:w-auto"
            >
              LINE連携を始める (URL未設定)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
