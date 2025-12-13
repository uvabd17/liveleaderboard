# Live Leaderboard

A powerful, real-time leaderboard system for competitions, hackathons, and events. Built with:
- **Next.js 14** (App Router) + TypeScript
- **Real-time Updates** via Server-Sent Events (SSE) with optimized throttling
- **Prisma + PostgreSQL** for persistent data storage
- **Multi-tenant** architecture with event-scoped pages
- **Flexible Judging** with customizable rubrics
- **Performance Optimized** for events with 100+ participants

## ✨ Key Features

### 🎯 Core Features
- **Live Leaderboard** - Real-time score updates with smooth animations
- **Pagination & Search** - Efficient browsing of large participant lists
- **Stage Display** - Full-screen projector mode with podium view
- **Customizable Rubrics** - Visual designer for scoring criteria
- **Judge Console** - Streamlined scoring interface
- **QR Registration** - Quick participant onboarding with tokens

### ⚡ Performance
- **SSE Optimization** - Throttling and diffing to reduce bandwidth
- **Client-side Pagination** - Smooth navigation for 100+ participants
- **Search & Filtering** - Fast participant lookup
- **Performance Profiling** - Built-in tools to measure response times

### 🧪 Testing
- **Smoke Tests** - Verify critical functionality
- **Performance Tests** - Measure API response times
- **Load Testing** - Simulate high-concurrency scenarios

## Quickstart

Requirements: Node.js 20+

```powershell
# from the project root
npm install
npm run dev
# open http://localhost:3000
```

Build and start:

```powershell
npm run build
npm start
```

## Try the demo flow
- Go to `/e/demo-event/admin` and navigate to the admin dashboard
- Generate registration tokens for participants
- Participants register via QR code or link
- Configure scoring rubric in the Rubrics Designer
- Judges access the Judge Console to score participants
- View live updates on the public leaderboard (`/e/demo-event`)
- Display on a projector using Stage Display (`/e/demo-event/stage`)

## Testing

Run smoke tests to verify functionality:

```powershell
node tests/smoke.test.mjs
```

Profile performance:

```powershell
node tests/performance-profile.mjs
```

Load test with concurrent requests:

```powershell
node tests/performance-profile.mjs --load-test
```

See `tests/README.md` for detailed documentation.

## Database Setup

### Local PostgreSQL with Prisma

```powershell
npx prisma migrate dev --name init
npx prisma generate
# seed demo org/event
Invoke-WebRequest -Method POST http://localhost:3000/api/dev-seed | Out-Null
```

## Use Supabase (managed Postgres)
1) Create a project at https://supabase.com and open Project Settings → Database → Connection string.
2) Copy the URI (Direct connection). It looks like:
	`postgresql://postgres:<PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`
3) Add it to `.env` as `DATABASE_URL`.

Apply the schema (development-friendly without migrations):
```powershell
# from project root
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres?sslmode=require"
npm run db:push
npm run db:generate
```

Optionally, seed demo org/event:
```powershell
Invoke-WebRequest -Method POST http://localhost:3000/api/dev-seed | Out-Null
```

Notes:
- For pooled connections, use Supabase Pooler with: `?pgbouncer=true&connection_limit=1&sslmode=require`.
- `db push` is fine for dev; switch to Prisma Migrate for production.

## Development status

- This project is actively under development. Bugs and incomplete features are expected; use with caution.
- Contributions are welcome — feel free to open issues or pull requests. For larger changes, please open an issue first to discuss the approach.
- Important: a major part of the codebase was generated or assisted by AI and has been integrated by the author. Review generated code carefully when contributing.

## Purpose

- Live Leaderboard provides a real-time, event-scoped leaderboard system for competitions, hackathons, and similar events. It supports participant registration, judge scoring, customizable rubrics, and a stage display for projector output.

## Contributing

- Open an issue to report bugs or request features.
- Fork the repo, make changes on a branch, and open a pull request. Add tests where appropriate and run existing smoke/performance tests.
- If you'd like, add a short note in your PR describing any AI-assisted code changes so reviewers can focus on those areas.

Thank you for your interest and help — contributions make this project better for everyone.
