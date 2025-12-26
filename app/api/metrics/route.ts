import { NextResponse } from 'next/server'
import serverCache from '@/lib/server-cache'

export async function GET() {
  try {
    const cacheMetrics = serverCache.getMetrics()
    const memory = process && typeof process.memoryUsage === 'function' ? process.memoryUsage() : null
    return NextResponse.json({ uptime: process.uptime(), cache: cacheMetrics, memory })
  } catch (e) {
    return NextResponse.json({ error: 'failed to collect metrics' }, { status: 500 })
  }
}
