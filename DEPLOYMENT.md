# Deployment Guide

This application is designed to be deployed on **Vercel** (Serverless) or any **Docker** compatible host (Railway, Coolify, AWS ECS).

## 1. Environment Variables

See `.env.example` for the complete list.
Critical variables:
- `DATABASE_URL`: Connection string for PostgreSQL.
- `NEXTAUTH_SECRET`: Random string for session encryption.
- `NEXTAUTH_URL`: The canonical URL of your deployment (e.g. `https://my-leaderboard.com`).
- `REDIS_URL`: (Optional) Connection string for Redis. Required if you are running multiple instances or serverless functions to ensure realtime sync.

## 2. Vercel Deployment (Recommended)

1.  Push code to GitHub/GitLab.
2.  Import project in Vercel.
3.  Configure Environment Variables in Vercel Project Settings.
4.  Deploy.
    -   *Note*: The `output: 'standalone'` in `next.config.mjs` is automatically effectively ignored by Vercel's build system (which uses its own optimization), but harmless.

## 3. Docker Deployment

We provide a multi-stage `Dockerfile` optimized for size (~100MB compressed).

### Build
```bash
docker build -t live-leaderboard .
```

### Run
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  live-leaderboard
```

## 4. Database Migrations

**Important**: Standard `npm run build` generates the Prisma Client but does **not** push schema changes to the DB.

In production, you should run migrations *before* the new deployment goes live.
On Vercel, you can add this to your "Build Command" or run it via a separate CI/CD step:

```bash
npx prisma migrate deploy
```

## 5. Scalability (Redis)

If you scale to >1 instance (or use Serverless functions), you **MUST** provide a `REDIS_URL`.
Without Redis, each instance will maintain its own in-memory leaderboard state, leading to inconsistent scores for users connected to different instances.

With `REDIS_URL` configured, the application automatically enables the `Redis` backend for the Hub, syncing state across all nodes instantly.
