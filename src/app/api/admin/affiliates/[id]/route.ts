import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUserEmail } from "@/auth";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const email = await getCurrentUserEmail();
        const adminEmail = process.env.ADMIN_EMAIL;

        if (!email || email !== adminEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        await sql`DELETE FROM affiliate_banners WHERE id = ${id}`;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
