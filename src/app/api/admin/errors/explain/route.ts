import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!session?.user?.email || session.user.email !== adminEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { errorMessage, context } = await request.json();

        const prompt = `以下のシステムエラーについて、原因と解決策を日本の非エンジニアや初級エンジニアにも分かりやすく解説してください。
【エラーメッセージ】
${errorMessage}

【コンテキスト】
${JSON.stringify(context, null, 2)}

マークダウン形式のコードブロック(\`\`\`)を使わず、プレーンテキストで、段落を分けて簡潔に返答してください。`;

        const useGemini = !!process.env.GEMINI_API_KEY;
        let explanation = "";

        if (useGemini) {
            const apiKey = process.env.GEMINI_API_KEY ?? "";
            const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                })
            });
            if (!res.ok) throw new Error("Gemini API Error");
            const data = await res.json();
            explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "解説を生成できませんでした。";
        } else {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });
            explanation = response.choices[0]?.message?.content?.trim() || "解説を生成できませんでした。";
        }

        return NextResponse.json({ explanation });
    } catch (error) {
        console.error("AI Explanation Error:", error);
        return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
    }
}
