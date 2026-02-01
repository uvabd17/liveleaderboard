# Production Secrets & Keys Guide

This document explains exactly how to obtain or generate the values for your `.env` file in production.

## 1. NEXTAUTH_SECRET
**What it is:** A random string used to encrypt user sessions.
**How to get it:**
Run this command in any terminal:
```bash
openssl rand -base64 32
```
*Output example:* `Jd8/3Kmn4+L0s1a2...` -> Copy this string.
*Alternative:* Generate a secure password from a password manager (LastPass/1Password).

## 2. DATABASE_URL & DIRECT_URL
**What it is:** Connection strings for your PostgreSQL database.
**Providers:**
-   **Supabase** (Recommended):
    1.  Create a project at [supabase.com](https://supabase.com).
    2.  Go to **Project Settings > Database > Connection pooler**.
    3.  `DATABASE_URL`: Copy the "Transaction" mode connection string (port 6543, `pgbouncer=true`).
    4.  `DIRECT_URL`: Copy the "Session" mode connection string (port 5432).
-   **Railway**:
    1.  Create a Postgres service.
    2.  Copy `DATABASE_URL` from the "Variables" tab.
    3.  Set `DIRECT_URL` to the same value if no pooler is used.

## 3. REDIS_URL
**What it is:** Connection string for Redis (required for multi-instance syncing).
**Providers:**
-   **Upstash** (Serverless, Free Tier):
    1.  Create a database at [upstash.com](https://upstash.com).
    2.  Copy the `UPSTASH_REDIS_REST_URL` or the standard connection string (starts with `rediss://`).
-   **Railway**:
    1.  Create a Redis service.
    2.  Copy `REDIS_URL` from Variables.

## 4. NEXTAUTH_URL
**What it is:** The canonical URL of your deployed site.
**Example:** `https://my-awesome-event.vercel.app`
**Important:**
-   On Vercel, this is usually auto-set, but best practice is to set it explicitly in Vercel Project Settings for production.
-   Ensure it starts with `https://`.

## 5. Other Toggles
-   `NEXT_PHASE`: Set to `phase-production-build` to disable seed data generation.
-   `HUB_INSTANCE_ID`: Usually not needed to set manually (defaults to random), but can be set to the server name (e.g. `nyc-node-1`) for debugging.
