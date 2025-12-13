import { hub } from '../../../lib/hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  // Extract eventSlug from query params
  const url = new URL(request.url)
  const eventSlug = url.searchParams.get('eventSlug')
  
  let closed = false
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      // Attempt to load DB participants on first connect if memory is empty
      // Fire-and-forget; snapshot will be sent on upsert
      try { (hub as any).loadFromDbIfEmpty?.() } catch {}
      const safeEnqueue = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // controller may be closed; ignore
        }
      }
      const send = (payload: any) => {
        // Filter messages by eventSlug if provided
        if (eventSlug && payload.eventSlug && payload.eventSlug !== eventSlug) {
          return // Skip this message
        }
        safeEnqueue(`data: ${JSON.stringify(payload)}\n\n`)
      }
      const close = () => {
        if (!closed) {
          closed = true
          try { controller.close() } catch {}
        }
      }
      const unsubscribe = hub.subscribe(send, close, eventSlug ?? undefined)
      const keepAlive = setInterval(() => {
        safeEnqueue(`: keep-alive\n\n`)
      }, 15000)
      // abort on client disconnect
      const signal = (request as any).signal as AbortSignal | undefined
      const onAbort = () => {
        clearInterval(keepAlive)
        unsubscribe()
        close()
      }
      if (signal) {
        if (signal.aborted) onAbort()
        else signal.addEventListener('abort', onAbort, { once: true })
      }
    },
    cancel() {
      closed = true
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
