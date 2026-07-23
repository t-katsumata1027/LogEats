import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { sendLarkNotification } from '@/lib/lark';
import { sql } from "@vercel/postgres";
import crypto from "node:crypto";

async function recordAuthEvent(userId: number, eventType: "sign_up" | "login") {
    try {
        await sql`
            INSERT INTO product_events (event_id, user_id, event_type, path, properties)
            VALUES (
                ${crypto.randomUUID()}::uuid,
                ${userId},
                ${eventType},
                '/api/webhooks/clerk',
                ${JSON.stringify({ source: 'clerk_webhook' })}::jsonb
            );
        `;
    } catch (error) {
        // 認証Webhookの成否を計測障害で失敗させない。
        console.error('Failed to record authentication product event:', error);
    }
}

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        return new Response('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local', {
            status: 400
        });
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400
        });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured', {
            status: 400
        });
    }

    const eventType = evt.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address || 'Unknown';
        const name = [first_name, last_name].filter(Boolean).join(' ') || 'Unknown';

        if (eventType === 'user.created') {
            try {
                // line_user_id は Messaging API 連携でのみ管理し、Clerk Webhook では設定しない
                const { rows } = await sql`
                    INSERT INTO users (clerk_id, email, name)
                    VALUES (${id}, ${email}, ${name})
                    ON CONFLICT (clerk_id) DO UPDATE SET 
                        email = EXCLUDED.email, 
                        name = EXCLUDED.name
                    RETURNING id
                `;
                if (rows[0]?.id) {
                    await recordAuthEvent(Number(rows[0].id), 'sign_up');
                }
            } catch (e) {
                console.error('Error inserting user:', e);
            }

            await sendLarkNotification(
                process.env.LARK_AUTH_WEBHOOK_URL,
                "🎉 新規ユーザー登録",
                `新しいユーザーが登録されました！\nID: ${id}\nEmail: ${email}\nName: ${name}`
            );
        } else if (eventType === 'user.updated') {
            // ユーザー情報（名前・メール）のみ更新。line_user_id は更新・解除しない
            try {
                await sql`
                    UPDATE users
                    SET email = ${email}, name = ${name}
                    WHERE clerk_id = ${id}
                `;
            } catch (e) {
                console.error('Error updating user info:', e);
            }
        }
    } else if (eventType === 'session.created') {
        const { user_id } = evt.data;

        let userName = 'Unknown';
        try {
            const { rows } = await sql`SELECT id, name, email FROM users WHERE clerk_id = ${user_id} LIMIT 1`;
            if (rows.length > 0) {
                userName = `${rows[0].name || ''} (${rows[0].email || ''})`.trim();
                await recordAuthEvent(Number(rows[0].id), 'login');
            }
        } catch (e) { }

        await sendLarkNotification(
            process.env.LARK_AUTH_WEBHOOK_URL,
            "🔑 ユーザーログイン",
            `ユーザーがログインしました。\nユーザー: ${userName}\nID: ${user_id}`
        );
    }

    return new Response('', { status: 200 });
}
