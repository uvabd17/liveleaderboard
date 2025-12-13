Deployment checklist — Per-round rubric & round-completion fixes

Purpose
- Describe steps to review, test, and deploy the per-round rubric and round-completion fixes applied to the codebase.

Pre-merge checks (local)
- Run unit/smoke tests:

```bash
npm run smoke:test
```

- Start dev server and run targeted end-to-end check (submit a test judge score and verify DB row):

```powershell
# start dev server (background)
npm run dev
# in a separate terminal (Windows PowerShell)
$env:BASE_URL='http://127.0.0.1:3000'; node tests/round_completion_check.mjs
```

- Verify SSE behavior: open browser to `/e/<your-event>/judge` and `/e/<your-event>/admin` and submit a score from judge UI; ensure admin snapshot and `round-completion` updates appear.
- Confirm `RoundCompletion` rows exist in DB (via Prisma Studio or direct query):

```bash
npx prisma studio
# or: node tests/list_round_completions.mjs
```

Code review items
- Confirm `app/api/judge/score/route.ts`:
  - Accepts object/array shapes for `scores` and normalizes keys.
  - Validates scores against `event.rules.rubric` keys.
  - Treats `roundNumber` as 1-based and upserts `RoundCompletion` using `eventId, participantId, roundNumber` unique index.
  - Broadcasts SSE events `leaderboard` and `round-completion` with `eventSlug`.
- Confirm hub (`lib/hub.ts`) snapshot includes `eventSlug` and subscriber filtering is applied.
- Confirm judge UIs (`app/judge/page.tsx`, `app/e/[eventSlug]/judge/page.tsx`) use `criterion.key` and send `roundNumber` and keyed `scores` map.
- Confirm admin UI uses GET `/api/judge/score?participantId=...` to fetch conflict/variance and `completedCurrentRound`.

Rollback plan
- If issues are detected after deploy, revert the commit and redeploy. The change set is limited and focused on API and client payloads.

Post-deploy verification
- Run smoke tests on the deployment host
- Submit several judge scores and ensure RoundCompletion rows are created and leaderboards update via SSE

PR description template
- Summary: Fixes rubric assignment per-round, persists per-team per-round completion, normalizes judge payloads, and scopes SSE by event.
- Files changed: `app/api/judge/score/route.ts`, `lib/hub.ts`, `app/judge/page.tsx`, `app/e/[eventSlug]/judge/page.tsx`, `app/admin/page.tsx` (+ tests added)
- Testing: Describe how to reproduce locally (see "Pre-merge checks")
- Migration: none (DB schema already contains `RoundCompletion`)
- Rollout notes: monitor SSE errors, API 400 responses for invalid rubric keys

If you want, I can open a PR branch with these changes and prepare the PR description content in the repo.