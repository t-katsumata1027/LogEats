import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { sendLarkNotification } from '@/lib/lark';
import { sql } from "@vercel/postgres";

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        return new Response('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local', {
            status: 400
        });
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400
        });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    // Verify the payload with the headers
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

    if (eventType === 'user.created') {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address || 'Unknown';
        const name = [first_name, last_name].filter(Boolean).join(' ') || 'Unknown';

        // Insert to users table optionally if not already done by auth.ts
        try {
            await sql`
        INSERT INTO users (id, email, name)
        VALUES (${id}, ${email}, ${name})
        ON CONFLICT (id) DO NOTHING
      `;
        } catch (e) {
            console.error(e);
        }

        await sendLarkNotification(
            "🎉 新規ユーザー登録",
            `新しいユーザーが登録されました！\nID: ${id}\nEmail: ${email}\nName: ${name}`
        );
    } else if (eventType === 'session.created') {
        const { user_id } = evt.data;

        // Optional: get user details from DB to enrich message
        let userName = 'Unknown';
        try {
            const { rows } = await sql`SELECT name, email FROM users WHERE id = ${user_id}`;
            if (rows.length > 0) {
                userName = `${rows[0].name || ''} (${rows[0].email || ''})`.trim();
            }
        } catch (e) { }

        await sendLarkNotification(
            "🔑 ユーザーログイン",
            `ユーザーがログインしました。\nユーザー: ${userName}\nID: ${user_id}`
        );
    }

    return new Response('', { status: 200 });
}
