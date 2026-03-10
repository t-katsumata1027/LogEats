import { NextRequest, NextResponse } from "next/server";
import { lineClient, lineBlobClient, lineConfig } from "@/lib/line";
import { WebhookEvent } from "@line/bot-sdk";
import crypto from 'crypto';
import { sql } from "@vercel/postgres";
import { put } from "@vercel/blob";
import {
    recognizeWithGemini,
    recognizeWithOpenAI,
    estimateNutritionWithAI,
    buildSummary,
    validateAndCalculateCalories,
    arrayBufferToBase64
} from "@/app/api/analyze/route";
import { lookupFoodMasterWithLearned, loadLearnedFoods, addLearnedFood } from "@/lib/foodDatabase";
import type { AnalyzedFood } from "@/lib/types";

export const maxDuration = 60; // タイムアウト延長

export async function POST(req: NextRequest) {
    try {
        const buffer = Buffer.from(await req.arrayBuffer());
        const signature = req.headers.get("x-line-signature") || "";

        const body = JSON.parse(buffer.toString('utf8'));
        const events: WebhookEvent[] = body.events;

        // LINE Developers Consoleからの「検証」リクエストはeventsが空の配列で送られてくる。
        // この検証リクエストには正しいsignatureが付与されていない場合があるため、
        // eventsが空の場合は署名検証をスキップして200を返す。
        if (!events || events.length === 0) {
            return NextResponse.json({ success: true, message: "Verification success" });
        }

        if (!lineConfig.channelSecret) {
            console.error("LINE_CHANNEL_SECRET is not set in environment variables");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        // Signature Validation using original bytes (Buffer)
        const hash = crypto
            .createHmac('sha256', lineConfig.channelSecret)
            .update(buffer)
            .digest('base64');

        if (hash !== signature) {
            console.error(`Invalid signature. Expected: ${signature}, Got: ${hash}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        for (const event of events) {
            if (event.type === 'message') {
                const lineUserId = event.source.userId;
                if (!lineUserId) continue;

                // DBからユーザー検索
                const { rows } = await sql`SELECT id FROM users WHERE line_user_id = ${lineUserId} LIMIT 1`;
                const userId = rows.length > 0 ? rows[0].id : null;

                if (event.message.type === 'image') {
                    // 画像の場合、解析処理を実行
                    try {
                        // 画像の取得
                        const streamOrBlob = await lineBlobClient.getMessageContent(event.message.id);
                        let arrayBuffer: ArrayBuffer;
                        if (streamOrBlob instanceof Blob) {
                            arrayBuffer = await streamOrBlob.arrayBuffer();
                        } else {
                            // Node.js stream fallback
                            const chunks = [];
                            for await (const chunk of streamOrBlob as any) {
                                chunks.push(chunk);
                            }
                            const buffer = Buffer.concat(chunks);
                            arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                        }

                        const base64 = arrayBufferToBase64(arrayBuffer);

                        // Gemini/OpenAIによる解析
                        const useGemini = !!process.env.GEMINI_API_KEY;
                        const { foods: recognizedRaw, is_ambiguous } = useGemini
                            ? await recognizeWithGemini(base64)
                            : await recognizeWithOpenAI(base64);

                        if (recognizedRaw.length === 0) {
                            await lineClient.replyMessage({
                                replyToken: event.replyToken,
                                messages: [{ type: 'text', text: '料理が検出できませんでした😢 もう少しはっきりと写した写真をお試しください。' }]
                            });
                            continue;
                        }

                        // 栄養素の算出
                        const learned = await loadLearnedFoods();
                        const foods: AnalyzedFood[] = [];

                        for (const { name, amount } of recognizedRaw) {
                            let masterRecord = lookupFoodMasterWithLearned(name, learned);

                            if (!masterRecord) {
                                masterRecord = await estimateNutritionWithAI(name, amount);
                                await addLearnedFood(name, masterRecord);
                            }

                            let weightG = masterRecord.standard_weight_g;
                            if (amount) {
                                const match = amount.match(/([0-9０-９]+(?:\.[0-9０-９]+)?)\s*(g|グラム|ml|ミリリットル)/i);
                                if (match) {
                                    const numStr = match[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
                                    const parsed = parseFloat(numStr);
                                    if (!isNaN(parsed) && parsed > 0) {
                                        weightG = parsed;
                                    }
                                }
                            }

                            const ratio = weightG / 100;
                            const initialProtein = masterRecord.per_100g.protein * ratio;
                            const initialFat = masterRecord.per_100g.fat * ratio;
                            const initialCarbs = masterRecord.per_100g.carbs * ratio;
                            const validatedCalories = validateAndCalculateCalories(initialProtein, initialFat, initialCarbs);

                            foods.push({
                                name,
                                nameJa: name,
                                amount: amount || masterRecord.unit_name,
                                calories: Math.round(validatedCalories),
                                protein: Math.round(initialProtein * 10) / 10,
                                fat: Math.round(initialFat * 10) / 10,
                                carbs: Math.round(initialCarbs * 10) / 10,
                            });
                        }

                        const summary = buildSummary(foods);

                        if (userId) {
                            // Blobストレージにアップロード
                            const ext = "jpg";
                            const blobFilename = `meals/${userId}_${Date.now()}.${ext}`;
                            const blobResult = await put(blobFilename, new Blob([arrayBuffer], { type: 'image/jpeg' }), { access: 'public' });
                            const imageUrl = blobResult.url;

                            // DBに記録
                            await sql`
                              INSERT INTO meal_logs (
                                user_id, image_url, total_calories, total_protein, 
                                total_fat, total_carbs, analyzed_data, meal_type
                              ) VALUES (
                                ${userId}, 
                                ${imageUrl}, 
                                ${summary.totalCalories}, 
                                ${summary.totalProtein}, 
                                ${summary.totalFat}, 
                                ${summary.totalCarbs}, 
                                ${JSON.stringify({ foods })},
                                'other'
                              )
                            `;
                        }

                        // LINEに結果を返信
                        let replyText = userId ? `🍽️ 記録完了！\n` : `🍽️ 解析完了！\n`;
                        replyText += `カロリー: ${summary.totalCalories}kcal\n[P] ${summary.totalProtein}g  [F] ${summary.totalFat}g  [C] ${summary.totalCarbs}g\n\n【内訳】\n`;
                        foods.forEach(f => {
                            replyText += `・${f.name} (${f.amount}) : ${f.calories}kcal\n`;
                        });
                        if (is_ambiguous) {
                            replyText += `\n⚠️ 写真が不鮮明で正しく分析できていない可能性があります`;
                        }
                        if (!userId) {
                            replyText += `\n\n💡 LogEatsアプリでLINE連携を行うと、今後の写真が自動で食事カレンダーに保存されるようになります！`;
                        }

                        await lineClient.replyMessage({
                            replyToken: event.replyToken,
                            messages: [{ type: 'text', text: replyText }]
                        });

                    } catch (e) {
                        console.error("Error analyzing LINE image", e);
                        await lineClient.replyMessage({
                            replyToken: event.replyToken,
                            messages: [{ type: 'text', text: 'エラーが発生しました💦 もう一度お試しください。' }]
                        });
                    }
                } else {
                    // 画像以外のメッセージ
                    await lineClient.replyMessage({
                        replyToken: event.replyToken,
                        messages: [{ type: 'text', text: '食事の写真を送ってね📷✨ 自動でカロリーを計算して記録します！' }]
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("LINE Webhook Error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
