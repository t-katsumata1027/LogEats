import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Clerkのリダイレクト処理はリクエストごとに実行する。
export const dynamic = "force-dynamic";

export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}
