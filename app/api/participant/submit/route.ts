
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cookies } from "next/headers"

export async function POST(req: Request) {
    try {
        const { eventSlug, roundNumber, url, notes } = await req.json()

        // Get session
        const event = await db.event.findUnique({ where: { slug: eventSlug } })
        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

        const participantId = cookies().get(`p_session_${event.id}`)?.value

        if (!participantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!url || !roundNumber) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Upsert submission (allow updating previous submission for same round)
        // First, find existing one to check if we update or create
        const existing = await db.submission.findFirst({
            where: {
                participantId,
                roundNumber: Number(roundNumber)
            }
        })

        let submission;
        if (existing) {
            submission = await db.submission.update({
                where: { id: existing.id },
                data: { url, notes }
            })
        } else {
            submission = await db.submission.create({
                data: {
                    participantId,
                    roundNumber: Number(roundNumber),
                    url,
                    notes
                }
            })
        }

        return NextResponse.json({ submission })

    } catch (error) {
        console.error("Submission error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
