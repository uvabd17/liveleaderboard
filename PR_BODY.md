PR: Fix per-round rubric assignment, persist round completions, and scope SSE

Summary
- Normalize judge payloads (use criterion keys, accept object or array) and treat `roundNumber` as 1-based.
- Persist per-participant per-round completions to `RoundCompletion` (upsert), recording `durationSeconds` when timer start is present.
- Scope SSE broadcasts by `eventSlug` and broadcast a `round-completion` event for UI updates.
- Update judge UIs to use `criterion.key` and include `roundNumber` when submitting.
- Add API GET `/api/judge/score?participantId=...` to return conflict/variance and completion metadata.

Files changed (high-level)
- `app/api/judge/score/route.ts`
- `lib/hub.ts`
- `app/judge/page.tsx`
- `app/e/[eventSlug]/judge/page.tsx`
- `app/admin/page.tsx`
- tests: `tests/round_completion_check.mjs`, `tests/list_round_completions.mjs`

Testing
- Smoke tests: `npm run smoke:test`
- Dev server: `npm run dev` then run the lightweight check:

```powershell
$env:BASE_URL='http://127.0.0.1:3000'; node tests/round_completion_check.mjs
```

Notes
- No DB schema migrations required (project already has `RoundCompletion`).
- If you want, I can push to a remote and open a GitHub PR, but I need remote credentials/config to push.
