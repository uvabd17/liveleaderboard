import { hub } from '../../../lib/hub'

export const runtime = 'nodejs'

export async function POST() {
  const tok = hub.createRegisterToken()
  return Response.json({ token: tok.token })
}
