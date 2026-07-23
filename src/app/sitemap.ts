import { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: absoluteUrl("/"),
            lastModified: new Date("2026-07-23"),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: absoluteUrl("/news"),
            lastModified: new Date("2026-07-23"),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: absoluteUrl("/news/line-integration-story"),
            lastModified: new Date("2024-03-11"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: absoluteUrl("/terms"),
            lastModified: new Date("2026-07-23"),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: absoluteUrl("/privacy"),
            lastModified: new Date("2026-07-23"),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: absoluteUrl("/how-it-works"),
            lastModified: new Date("2026-07-24"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
    ];
}
