import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/api/logs/manual(.*)',    // 公開API（未ログインでも利用可）
    '/api/analyze(.*)',        // 公開API（未ログインでも利用可）
    '/api/track',              // 匿名ユーザーを含む行動計測
    '/api/cron/daily-report',  // Vercel Cron。Route側のCRON_SECRETで認証
    '/api/webhooks/(.*)',      // ClerkやLINEのWebhook用ルート
    '/line/link(.*)',           // LINEアカウント連携確認ページ（公開）
    '/terms',
    '/privacy',
    '/news(.*)',               // お知らせ・記事ページ（AdSense用）
    '/share(.*)',              // 公開シェアページ
    '/s/(.*)',                 // 短縮URLシェアページ
    '/api/affiliates/random',  // アフィリエイト広告取得API（公開）
    '/robots.txt',
    '/sitemap.xml',
    '/ads.txt',
    '/manifest.webmanifest',
])

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
