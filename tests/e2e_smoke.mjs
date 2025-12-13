#!/usr/bin/env node
/*
  Lightweight E2E smoke script (read-only checks).

  Usage:
    NODE_ENV=development BASE=http://localhost:3000 EVENT_SLUG=demo node tests/e2e_smoke.mjs

  The script performs simple GET requests against key endpoints and exits
  with non-zero status on failures. It does NOT POST or change DB by default.
*/

const BASE = process.env.BASE || 'http://localhost:3000'
let EVENT = process.env.EVENT_SLUG || process.env.EVENT || ''

// Try to auto-detect an event slug from tmp/event.json if not provided
if (!EVENT) {
  try {
    const fs = await import('fs')
    const data = fs.readFileSync(new URL('../tmp/event.json', import.meta.url))
    const parsed = JSON.parse(String(data))
    if (parsed?.event?.slug) EVENT = parsed.event.slug
  } catch (e) {
    // ignore
  }
}
if (!EVENT) EVENT = 'demo-event'

function log(...args) { console.log('[e2e]', ...args) }

async function run() {
  try {
    log('Base URL:', BASE)
    log('Event slug:', EVENT)

    const endpoints = [
      `/api/events/${EVENT}`,
      `/api/rounds?eventSlug=${EVENT}`,
      `/api/events/${EVENT}/participants`,
      `/api/events/${EVENT}/round-completions`,
    ]

    for (const ep of endpoints) {
      const url = new URL(ep, BASE).toString()
      log('GET', url)
      const res = await fetch(url)
      if (!res.ok) {
        log('FAIL:', ep, 'status', res.status)
        process.exitCode = 2
      } else {
        log('OK:', ep, 'status', res.status)
      }
      // small delay
      await new Promise(r => setTimeout(r, 250))
    }

    if (process.exitCode && process.exitCode !== 0) {
      log('One or more checks failed')
      process.exit(process.exitCode)
    }

    log('All checks completed')
  } catch (err) {
    console.error('e2e error', err)
    process.exit(1)
  }
}

run()
