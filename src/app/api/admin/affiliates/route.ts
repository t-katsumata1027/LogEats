import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getCurrentUserEmail } from "@/auth";
import {
  ALLOWED_AFFILIATE_NETWORKS,
  containsDangerousPattern,
  isAllowedAffiliateHost,
} from "@/lib/affiliateConfig";

export async function GET(req: Request) {
  try {
    const email = await getCurrentUserEmail();
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!email || email !== adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sql`
      SELECT
        id,
        name,
        html_content,
        is_active,
        affiliate_network,
        campaign_id,
        creative_id,
        target_domain,
        created_at
      FROM affiliate_banners
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ banners: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const email = await getCurrentUserEmail();
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!email || email !== adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      html_content,
      affiliate_network = "a8",
      campaign_id = null,
      creative_id = null,
      target_domain = null,
    } = body;

    // バリデーション
    if (
      typeof name !== "string" ||
      name.trim().length === 0 ||
      name.length > 255
    ) {
      return NextResponse.json(
        { error: "Invalid banner name (must be 1-255 characters)" },
        { status: 400 }
      );
    }

    if (
      typeof html_content !== "string" ||
      html_content.trim().length === 0 ||
      html_content.length > 100_000 ||
      containsDangerousPattern(html_content)
    ) {
      return NextResponse.json(
        { error: "Invalid HTML content or dangerous script detected" },
        { status: 400 }
      );
    }

    const networkStr = String(affiliate_network || "a8").toLowerCase().trim();
    if (!ALLOWED_AFFILIATE_NETWORKS.has(networkStr)) {
      return NextResponse.json(
        { error: `Unsupported affiliate network: ${affiliate_network}` },
        { status: 400 }
      );
    }

    let validTargetDomain: string | null = null;
    if (target_domain !== undefined && target_domain !== null && target_domain !== "") {
      if (typeof target_domain !== "string" || target_domain.length > 255) {
        return NextResponse.json(
          { error: "Invalid target_domain length" },
          { status: 400 }
        );
      }
      const trimmedDomain = target_domain.trim();
      if (!isAllowedAffiliateHost(trimmedDomain)) {
        return NextResponse.json(
          { error: `target_domain '${trimmedDomain}' is not in allowed affiliate list` },
          { status: 400 }
        );
      }
      validTargetDomain = trimmedDomain;
    }

    let validCampaignId: string | null = null;
    if (campaign_id !== undefined && campaign_id !== null && campaign_id !== "") {
      if (typeof campaign_id !== "string" || campaign_id.length > 100) {
        return NextResponse.json(
          { error: "Invalid campaign_id (max 100 characters)" },
          { status: 400 }
        );
      }
      validCampaignId = campaign_id.trim();
    }

    let validCreativeId: string | null = null;
    if (creative_id !== undefined && creative_id !== null && creative_id !== "") {
      if (typeof creative_id !== "string" || creative_id.length > 100) {
        return NextResponse.json(
          { error: "Invalid creative_id (max 100 characters)" },
          { status: 400 }
        );
      }
      validCreativeId = creative_id.trim();
    }

    const result = await sql`
      INSERT INTO affiliate_banners (
        name,
        html_content,
        affiliate_network,
        campaign_id,
        creative_id,
        target_domain
      )
      VALUES (
        ${name.trim()},
        ${html_content},
        ${networkStr},
        ${validCampaignId},
        ${validCreativeId},
        ${validTargetDomain}
      )
      RETURNING *
    `;

    return NextResponse.json({ banner: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
