"use client";

import { useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";

interface LineLinkClientProps {
  linkToken: string;
}

export function LineLinkClient({ linkToken }: LineLinkClientProps) {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // linkTokenの入力バリデーション
  const isValidToken = 
    Boolean(linkToken) && 
    typeof linkToken === "string" && 
    linkToken.trim().length > 0 && 
    linkToken.length <= 1000;

  if (!isValidToken) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-sage-100 shadow-sm text-center max-w-md mx-auto">
        <span className="text-4xl mb-4 block">⚠️</span>
        <h2 className="text-xl font-bold text-sage-800 mb-2">連携トークンが無効または期限切れです</h2>
        <p className="text-sage-600 text-sm mb-6 leading-relaxed">
          LINE公式アカウントを開き、<span className="font-bold text-emerald-600">「連携」</span>と送信して、最初からやり直してください。
        </p>
        <a 
          href={process.env.NEXT_PUBLIC_LINE_CONNECT_URL || process.env.NEXT_PUBLIC_LINE_FRIEND_URL || "https://line.me"} 
          className="btn btn-primary bg-[#06C755] hover:bg-[#05b34c] text-white border-none rounded-xl font-bold px-6"
        >
          公式LINEを開く
        </a>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg text-sage-600"></span>
      </div>
    );
  }

  // 未ログインの場合
  if (!user) {
    // ログイン完了後、現在のURL（linkToken含む）に戻す
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";

    return (
      <div className="bg-white rounded-2xl p-8 border border-sage-100 shadow-sm text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-[#06C755]/10 text-[#06C755] rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          💬
        </div>
        <h2 className="text-xl font-bold text-sage-800 mb-3">LogEats LINE連携</h2>
        <p className="text-sage-600 text-sm mb-6 leading-relaxed">
          LINEと連携すると、食事の写真を送るだけで自動でカロリーとPFCバランスを計算・記録できます。<br />
          連携を続けるにはLogEatsアカウントにログインしてください。
        </p>

        <SignInButton mode="modal" forceRedirectUrl={currentUrl}>
          <button className="btn btn-primary bg-sage-600 hover:bg-sage-700 text-white border-none rounded-xl w-full font-bold py-3 text-base">
            ログインして連携する
          </button>
        </SignInButton>
      </div>
    );
  }

  // ログイン済みの場合
  const handleStartLink = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/line/account-link/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "連携の開始に失敗しました");
      }

      if (data.redirectUrl) {
        // LINE公式のアカウント連携画面へリダイレクト
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("リダイレクトURLが取得できませんでした");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "エラーが発生しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-sage-100 shadow-sm max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-sage-800 mb-4 flex items-center gap-2">
        <span>🔗</span> LINE連携アカウントの確認
      </h2>

      {/* ログインユーザー情報 */}
      <div className="bg-sage-50 rounded-xl p-4 mb-6 border border-sage-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-sage-200 flex items-center justify-center font-bold text-sage-700 text-lg">
          👤
        </div>
        <div>
          <p className="text-xs text-sage-500 font-medium">現在ログイン中のアカウント</p>
          <p className="font-bold text-sage-800 text-sm">
            {user.fullName || user.primaryEmailAddress?.emailAddress || "LogEats ユーザー"}
          </p>
          <p className="text-xs text-sage-600">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      {/* 注意事項リスト */}
      <div className="space-y-3 mb-6 text-sm text-sage-700 leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-100">
        <p className="font-bold text-amber-900 flex items-center gap-1">
          <span>ℹ️</span> 連携に関するご注意
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
          <li>このLogEatsアカウントにLINEアカウントを紐付けます。</li>
          <li>もし別のLogEatsアカウントに連携済みの場合、<span className="font-bold">今後の記録先が現在のアカウントへ変更</span>されます。</li>
          <li>過去の食事記録が移動・削除されることはありません。</li>
          <li>未連携状態で解析された写真は後から保存されません。連携完了後に送った写真から自動保存されます。</li>
        </ul>
      </div>

      {errorMsg && (
        <div className="alert alert-error text-sm text-red-800 bg-red-50 border-red-200 mb-4 py-2">
          <span>❌ {errorMsg}</span>
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleStartLink}
          disabled={isLoading}
          className="btn bg-[#06C755] hover:bg-[#05b34c] text-white border-none rounded-xl font-bold flex-1 py-3 text-base flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm text-white"></span>
          ) : (
            "このアカウントにLINEを連携する"
          )}
        </button>

        <a
          href="/dashboard"
          className="btn btn-outline border-sage-300 text-sage-700 hover:bg-sage-50 rounded-xl font-bold text-center py-3 text-base"
        >
          キャンセル
        </a>
      </div>
    </div>
  );
}
