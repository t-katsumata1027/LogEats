import { NextRequest, NextResponse } from "next/server";
import { lineClient, lineBlobClient, lineConfig } from "@/lib/line";
import { WebhookEvent, TemplateMessage } from "@line/bot-sdk";
import crypto from 'crypto';
import { sql, db } from "@vercel/postgres";
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
import { sanitizeNutrition } from "@/lib/nutrition";
import type { AnalyzedFood } from "@/lib/types";
import { createRequestId, logStep } from "@/lib/analyzeLogger";
import { issueLinkToken, completeAccountLink } from "@/lib/lineAccountLink";
import { siteUrl } from "@/lib/site";

export const maxDuration = 60; // タイムアウト延長

export async function POST(req: NextRequest) {
    try {
        const buffer = Buffer.from(await req.arrayBuffer());
        const signature = req.headers.get("x-line-signature") || "";

        const body = JSON.parse(buffer.toString('utf8'));
        const events: WebhookEvent[] = body.events;

        // LINE Developers Consoleからの「検証」リクエストはeventsが空の配列で送られてくる。
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
            console.error("Invalid LINE signature verification failed");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        let hasProcessedImage = false;

        for (const event of events) {
            // 1. アカウント連携イベント (accountLink) の処理
            if (event.type === 'accountLink') {
                const lineUserId = event.source.userId;
                if (!lineUserId) continue;

                const rawNonce = event.link.nonce;
                const result = event.link.result; // 'ok' | 'failed'

                const client = await db.connect();
                let completeRes;
                try {
                    await client.query("BEGIN");
                    completeRes = await completeAccountLink(rawNonce, lineUserId, result, client);
                    await client.query("COMMIT");
                } catch (err) {
                    await client.query("ROLLBACK").catch(() => {});
                    console.error("Error in accountLink event handler transaction");
                    completeRes = { status: 'failed', isTransferred: false };
                } finally {
                    client.release();
                }

                let replyMessageText = "";
                if (completeRes.status === 'completed') {
                    if (completeRes.isTransferred) {
                        replyMessageText = "✅ LINEの記録先を現在のLogEatsアカウントへ変更しました。過去の記録は元のアカウントに残っています。";
                    } else {
                        replyMessageText = "🎉 LINE連携が完了しました！次に送った食事写真からLogEatsへ自動保存されます。";
                    }
                } else {
                    replyMessageText = "❌ LINE連携に失敗しました。有効期限切れかトークンが無効の可能性があります。もう一度LINEで「連携」と送信してお試しください。";
                }

                if (event.replyToken) {
                    await lineClient.replyMessage({
                        replyToken: event.replyToken,
                        messages: [{ type: 'text', text: replyMessageText }]
                    });
                }
                continue;
            }

            // 2. メッセージイベント (message) の処理
            if (event.type === 'message') {
                const lineUserId = event.source.userId;
                if (!lineUserId) continue;

                // DBからユーザー検索
                const { rows } = await sql`SELECT id FROM users WHERE line_user_id = ${lineUserId} LIMIT 1`;
                const userId = rows.length > 0 ? rows[0].id : null;

                if (event.message.type === 'image') {
                    if (hasProcessedImage) {
                        await lineClient.replyMessage({
                            replyToken: event.replyToken,
                            messages: [{ type: 'text', text: '⚠️ 複数画像が同時に送信されたため、最初の1枚のみを解析しました！\nお手数ですが、1枚ずつ別々に送信してください🙇‍♂️' }]
                        });
                        continue;
                    }
                    hasProcessedImage = true;

                    // ローディング表示開始
                    if (event.source.userId) {
                        try {
                            await fetch("https://api.line.me/v2/bot/chat/loading/start", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${lineConfig.channelAccessToken}`
                                },
                                body: JSON.stringify({
                                    chatId: event.source.userId,
                                    loadingSeconds: 60
                                })
                            });
                        } catch (e) {
                            console.error("Failed to start loading animation");
                        }
                    }

                    // 未連携ユーザーへの返信メッセージ構築（Reply APIは同一リクエストで送信）
                    const replyMessages: any[] = [
                        {
                            type: 'text',
                            text: userId
                                ? '🍽️ 写真を受け取ったよ！\nAIがカロリーを分析中だから数秒待ってね🔍'
                                : '🍽️ 写真を受け取ったよ！\nAIがカロリーを分析中だから数秒待ってね🔍\n(※連携していないため現在の分析結果は保存されません)'
                        }
                    ];

                    if (!userId) {
                        try {
                            const linkToken = await issueLinkToken(lineUserId);
                            const linkUrl = `${siteUrl}/line/link?linkToken=${encodeURIComponent(linkToken)}`;
                            const buttonTemplate: TemplateMessage = {
                                type: "template",
                                altText: "LogEatsアカウント連携",
                                template: {
                                    type: "buttons",
                                    text: "現在の分析結果は保存されません。連携完了後に送った写真から自動保存されます。",
                                    actions: [
                                        {
                                            type: "uri",
                                            label: "LogEatsに連携する",
                                            uri: linkUrl
                                        }
                                    ]
                                }
                            };
                            replyMessages.push(buttonTemplate);
                        } catch (tokenErr) {
                            console.error("Link token issue failed for image message");
                        }
                    }

                    await lineClient.replyMessage({
                        replyToken: event.replyToken,
                        messages: replyMessages
                    });

                    // 解析処理を実行
                    try {
                        const streamOrBlob = await lineBlobClient.getMessageContent(event.message.id);
                        let arrayBuffer: ArrayBuffer;
                        if (streamOrBlob instanceof Blob) {
                            arrayBuffer = await streamOrBlob.arrayBuffer();
                        } else {
                            const chunks = [];
                            for await (const chunk of streamOrBlob as any) {
                                chunks.push(chunk);
                            }
                            const buffer = Buffer.concat(chunks);
                            arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                        }

                        const base64 = arrayBufferToBase64(arrayBuffer);

                        const requestId = createRequestId();
                        const useGemini = !!process.env.GEMINI_API_KEY;

                        // P0: lineUserId をログから除外
                        await logStep(requestId, "line", "START", {
                            aiProvider: useGemini ? "gemini" : "openai",
                        });

                        const { foods: recognizedRaw, is_ambiguous } = useGemini
                            ? await recognizeWithGemini(base64)
                            : await recognizeWithOpenAI(base64);

                        await logStep(requestId, "line", "AI_RECOGNITION_RESULT", {
                            is_ambiguous,
                            recognizedCount: recognizedRaw.length,
                            foods: recognizedRaw.map((f) => ({
                                name: f.name,
                                amount: f.amount,
                                hasLabelNutrition: !!f.label_nutrition,
                                label_nutrition: f.label_nutrition ?? null,
                            })),
                        });

                        if (recognizedRaw.length === 0) {
                            if (event.source.userId) {
                                await lineClient.pushMessage({
                                    to: event.source.userId,
                                    messages: [{ type: 'text', text: '料理が検出できませんでした😢 もう少しはっきりと写した写真をお試しください。' }]
                                });
                            }
                            continue;
                        }

                        const learned = await loadLearnedFoods();
                        const foods: AnalyzedFood[] = [];

                        for (const { name, amount, label_nutrition } of recognizedRaw) {
                            if (
                                label_nutrition &&
                                typeof label_nutrition.protein === "number" &&
                                typeof label_nutrition.fat === "number" &&
                                typeof label_nutrition.carbs === "number"
                            ) {
                                const initialFood: AnalyzedFood = {
                                    name,
                                    nameJa: name,
                                    amount: amount || "1個",
                                    calories: Math.round(label_nutrition.calories || 0),
                                    protein: Math.round(label_nutrition.protein * 10) / 10,
                                    fat: Math.round(label_nutrition.fat * 10) / 10,
                                    carbs: Math.round(label_nutrition.carbs * 10) / 10,
                                    label_nutrition,
                                };

                                const { food: correctedFood, isCorrected, reason } = sanitizeNutrition(initialFood);

                                if (isCorrected) {
                                    await logStep(requestId, "line", "NUTRITION_CORRECTED", {
                                        name,
                                        original: initialFood.calories,
                                        corrected: correctedFood.calories,
                                        reason
                                    });
                                }

                                await logStep(requestId, "line", "LABEL_BYPASS", { 
                                    name, 
                                    amount, 
                                    label_nutrition,
                                    finalCalories: correctedFood.calories
                                });
                                
                                foods.push(correctedFood);
                                continue;
                            }

                            let masterRecord = lookupFoodMasterWithLearned(name, learned);

                            if (!masterRecord) {
                                await logStep(requestId, "line", "DB_LOOKUP_MISS", { name, amount });
                                masterRecord = await estimateNutritionWithAI(name, amount);
                                await logStep(requestId, "line", "AI_ESTIMATION_RESULT", { name, amount, masterRecord });
                                await addLearnedFood(name, masterRecord);
                            } else {
                                await logStep(requestId, "line", "DB_LOOKUP_HIT", { name, masterRecord });
                            }

                            let weightG = masterRecord.standard_weight_g;
                            if (amount) {
                                const match = amount.match(/([0-9０-９]+(?:\.[0-9０-９]+)?)\s*(g|グラム|ml|ミリリットル)/i);
                                if (match) {
                                    const numStr = match[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
                                    const parsed = parseFloat(numStr);
                                    if (!isNaN(parsed) && parsed > 0) {
                                        const prevWeight = weightG;
                                        weightG = parsed;
                                        await logStep(requestId, "line", "WEIGHT_OVERRIDE", {
                                            name,
                                            amountString: amount,
                                            prevWeightG: prevWeight,
                                            newWeightG: weightG,
                                        });
                                    }
                                }
                            }

                            const ratio = weightG / 100;
                            const initialProtein = masterRecord.per_100g.protein * ratio;
                            const initialFat = masterRecord.per_100g.fat * ratio;
                            const initialCarbs = masterRecord.per_100g.carbs * ratio;
                            const validatedCalories = validateAndCalculateCalories(initialProtein, initialFat, initialCarbs);

                            await logStep(requestId, "line", "FOOD_CALC", {
                                name,
                                amount,
                                weightG,
                                per100g: masterRecord.per_100g,
                                calculated: {
                                    calories: Math.round(validatedCalories),
                                    protein: Math.round(initialProtein * 10) / 10,
                                    fat: Math.round(initialFat * 10) / 10,
                                    carbs: Math.round(initialCarbs * 10) / 10,
                                },
                            });

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

                        await logStep(requestId, "line", "SUMMARY", {
                            totalCalories: summary.totalCalories,
                            totalProtein: summary.totalProtein,
                            totalFat: summary.totalFat,
                            totalCarbs: summary.totalCarbs,
                            foodCount: foods.length,
                        });

                        if (userId) {
                            const ext = "jpg";
                            const blobFilename = `meals/${userId}_${Date.now()}.${ext}`;
                            const blobResult = await put(blobFilename, new Blob([arrayBuffer], { type: 'image/jpeg' }), { access: 'public' });
                            const imageUrl = blobResult.url;

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

                        let replyText = userId ? `🍽️ 記録完了！\n` : `🍽️ 解析完了！\n`;
                        replyText += `カロリー: ${summary.totalCalories}kcal\nタンパク質: ${Number(summary.totalProtein).toFixed(1)}g\n脂質: ${Number(summary.totalFat).toFixed(1)}g\n炭水化物: ${Number(summary.totalCarbs).toFixed(1)}g\n\n【内訳】\n`;
                        foods.forEach(f => {
                            replyText += `・${f.name} (${f.amount}) : ${f.calories}kcal\n`;
                        });
                        if (is_ambiguous) {
                            replyText += `\n⚠️ 写真が不鮮明で正しく分析できていない可能性があります`;
                        }

                        if (!userId) {
                            // P0-2: Push メッセージ送信直前に新しい link token を発行し、クエリ付きURLを含める
                            let resultLinkUrl = "";
                            try {
                                const pushToken = await issueLinkToken(lineUserId);
                                resultLinkUrl = `${siteUrl}/line/link?linkToken=${encodeURIComponent(pushToken)}`;
                            } catch {
                                // 発行失敗時はURLを含めない
                            }

                            replyText += `\n\n⚠️ 今回の写真は保存されません。連携後に送った写真から自動保存されます。\n`;
                            if (resultLinkUrl) {
                                replyText += `\n👉 アカウント連携はこちら:\n${resultLinkUrl}`;
                            } else {
                                replyText += `\n💡 LINEで「連携」と送信すると、連携用リンクを発行できます。`;
                            }
                        } else {
                            replyText += `\n\n✅ 記録を確認・修正する:\n👉 ${siteUrl}/dashboard`;
                        }

                        if (event.source.userId) {
                            await lineClient.pushMessage({
                                to: event.source.userId,
                                messages: [{ type: 'text', text: replyText }]
                            });
                        }

                    } catch (e) {
                        console.error("Error analyzing LINE image");
                        if (event.source.userId) {
                            await lineClient.pushMessage({
                                to: event.source.userId,
                                messages: [{ type: 'text', text: 'エラーが発生しました💦 もう一度お試しください。' }]
                            });
                        }
                    }
                } else if (event.message.type === 'text') {
                    const text = event.message.text.trim();

                    if (text === '連携' || text === '連携する' || text === 'アカウント連携') {
                        if (userId) {
                            await lineClient.replyMessage({
                                replyToken: event.replyToken,
                                messages: [{
                                    type: 'text',
                                    text: `✅ すでに連携済みです！\nLINEから送った食事写真は自動でLogEatsに記録されます。\n\n⚙️ 設定・解除はこちら:\n${siteUrl}/settings`
                                }]
                            });
                        } else {
                            try {
                                const linkToken = await issueLinkToken(lineUserId);
                                const linkUrl = `${siteUrl}/line/link?linkToken=${encodeURIComponent(linkToken)}`;
                                const buttonTemplate: TemplateMessage = {
                                    type: "template",
                                    altText: "LogEatsアカウント連携",
                                    template: {
                                        type: "buttons",
                                        text: "LogEatsアカウントとLINEを連携します。以下のボタンから手続きを行なってください。",
                                        actions: [
                                            {
                                                type: "uri",
                                                label: "LogEatsに連携する",
                                                uri: linkUrl
                                            }
                                        ]
                                    }
                                };
                                await lineClient.replyMessage({
                                    replyToken: event.replyToken,
                                    messages: [buttonTemplate]
                                });
                            } catch (tokenErr) {
                                console.error("Link token issue failed for text message");
                                await lineClient.replyMessage({
                                    replyToken: event.replyToken,
                                    messages: [{
                                        type: 'text',
                                        text: `⚠️ 連携手続きの開始に失敗しました。時間をおいてもう一度お試しください。\n👉 手動で連携ページを開く: ${siteUrl}/settings`
                                    }]
                                });
                            }
                        }
                    } else {
                        const nonImageReply = userId
                            ? '食事の写真を送ってね📷✨ 自動でカロリーを計算して記録します！'
                            : '食事の写真を送ってね📷✨ カロリーを計算するよ！\n\n💡 LogEatsにアカウント登録・LINE連携すると、日々の食事がグラフやカレンダーに自動で記録されてとっても便利です！\n👉 こちらから: ' + siteUrl;

                        await lineClient.replyMessage({
                            replyToken: event.replyToken,
                            messages: [{ type: 'text', text: nonImageReply }]
                        });
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("LINE Webhook Error");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
