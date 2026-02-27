import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://log-eats.vercel.app";

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/admin/"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
