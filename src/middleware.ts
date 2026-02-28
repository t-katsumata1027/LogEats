import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/api/logs/manual(.*)',    // 公開API（未ログインでも利用可）
    '/api/analyze(.*)',        // 公開API（未ログインでも利用可）
    '/terms',
    '/privacy',
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
