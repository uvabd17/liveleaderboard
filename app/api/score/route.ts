import { hub } from '../../../lib/hub'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, delta } = body
    if (typeof id !== 'string' || typeof delta !== 'number') {
      return Response.json({ error: 'invalid payload' }, { status: 400 })
    }
    hub.updateScore(id, delta)
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
