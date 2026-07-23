import { LineLinkClient } from "@/components/LineLinkClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "LINEアカウント連携 | LogEats",
  description: "LINE公式アカウントとLogEatsアカウントを連携します。",
  referrer: "no-referrer",
};

interface PageProps {
  searchParams: Promise<{ linkToken?: string }>;
}

export default async function LineLinkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const linkToken = params.linkToken || "";

  return (
    <main className="min-h-screen bg-sage-50/50 py-12 px-4 flex items-center justify-center">
      <LineLinkClient linkToken={linkToken} />
    </main>
  );
}
