import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Log-Eats",
        short_name: "Log-Eats",
        description: "AIで毎日の食事を賢く記録する食事管理アプリ",
        start_url: "/",
        display: "standalone",
        background_color: "#f3f5ef", // bg-cream
        theme_color: "#fafafa",
        icons: [
            {
                src: "/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
            }
        ],
    };
}
