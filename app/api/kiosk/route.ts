import { hub } from '../../../lib/hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns a fresh single-use token on each call (for kiosk auto-issue)
export async function POST() {
  const tok = hub.createRegisterToken()
  return Response.json({ token: tok.token })
}
