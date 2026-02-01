
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cookies } from "next/headers"

export async function POST(req: Request) {
    try {
        const { accessCode, eventSlug } = await req.json()

        if (!accessCode || !eventSlug) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const event = await db.event.findUnique({ where: { slug: eventSlug } })
        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

        const participant = await db.participant.findFirst({
            where: {
                eventId: event.id,
                accessCode: accessCode,
            },
            select: { id: true, name: true, kind: true }
        })

        if (!participant) {
            return NextResponse.json({ error: "Invalid Access Code" }, { status: 401 })
        }

        // Set secure HttpOnly cookie for the session
        // Simple approach: store participantId in cookie
        // In production, sign this with JWT secret
        cookies().set(`p_session_${event.id}`, participant.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        })

        return NextResponse.json({ participant })

    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
