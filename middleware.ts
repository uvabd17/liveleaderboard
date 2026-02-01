import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// In-memory rate limiting for Edge/Middleware (best-effort per-instance)
// For 1000 users, we usually have a few instances.
const ipCache = new Map<string, { count: number; lastReset: number }>()
const AUTH_LIMIT = 5 // max attempts per window
const WINDOW_MS = 60 * 1000 // 1 minute

// Legacy routes that have been moved to /e/[eventSlug]/...
// These redirect to dashboard since we don't know which event user wanted
const LEGACY_ROUTES = ['/stage', '/kiosk', '/leaderboard', '/register', '/judge', '/admin', '/test']

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // 0. Legacy Route Redirects
    // Old routes without event slug now redirect to dashboard
    const legacyMatch = LEGACY_ROUTES.find(route => pathname === route || pathname.startsWith(route + '/'))
    if (legacyMatch) {
        // Redirect to dashboard where user can select an event
        return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // 1. Rate Limiting for Auth/Sensitive routes
    if (pathname.startsWith('/api/auth/callback/credentials') || pathname.startsWith('/api/auth/signin')) {
        const ip = req.ip || '127.0.0.1'
        const now = Date.now()
        const entry = ipCache.get(ip) || { count: 0, lastReset: now }

        if (now - entry.lastReset > WINDOW_MS) {
            entry.count = 1
            entry.lastReset = now
        } else {
            entry.count++
        }
        ipCache.set(ip, entry)

        if (entry.count > AUTH_LIMIT) {
            return new NextResponse('Too many login attempts. Please try again in a minute.', { status: 429 })
        }
    }

    // 2. Protect Admin routes
    if (pathname.includes('/admin')) {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
        // Basic protection; detailed role checks are inside the pages
        if (!token) {
            const url = new URL('/auth/signin', req.url)
            url.searchParams.set('callbackUrl', encodeURI(req.url))
            return NextResponse.redirect(url)
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/api/auth/:path*',
        '/e/:eventSlug/admin/:path*',
        // Legacy routes to redirect
        '/stage/:path*',
        '/kiosk/:path*',
        '/leaderboard/:path*',
        '/register/:path*',
        '/judge/:path*',
        '/admin/:path*',
        '/test/:path*',
    ],
}
