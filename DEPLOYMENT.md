# Vercel Deployment Guide

This guide walks you through deploying Live Leaderboard to Vercel.

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Supabase Database**: Your PostgreSQL database (already set up)
4. **(Optional) Resend Account**: For email verification - [resend.com](https://resend.com)
5. **(Optional) Google Cloud Project**: For OAuth - [console.cloud.google.com](https://console.cloud.google.com)

## Step 1: Push to GitHub

```bash
# If you haven't pushed yet
git push origin consolidated-changes-20251215

# Or push to main
git checkout main
git merge consolidated-changes-20251215
git push origin main
```

## Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your `liveleaderboard` repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: `.next` (default)

## Step 3: Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...?pgbouncer=true` | Supabase pooled connection |
| `DIRECT_URL` | `postgresql://...` | Supabase direct connection |
| `NEXTAUTH_SECRET` | `<generate-32-char-secret>` | Auth encryption key |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel domain |

### Optional Variables (Recommended for Production)

| Variable | Value | Description |
|----------|-------|-------------|
| `GOOGLE_CLIENT_ID` | `<from-google-console>` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `<from-google-console>` | Google OAuth client secret |
| `RESEND_API_KEY` | `re_...` | Resend API key for emails |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Email sender address |
| `EMAIL_VERIFICATION_REQUIRED` | `true` or `false` | Require email verification |

### Optional Variables (Performance)

| Variable | Value | Description |
|----------|-------|-------------|
| `REDIS_URL` | `rediss://...` | Upstash Redis for scaling |
| `LEADERBOARD_CACHE_MS` | `15000` | Cache duration (ms) |
| `ENABLE_LEADERBOARD_CACHE` | `true` | Enable caching |

## Step 4: Setup Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Authorized JavaScript origins**: 
     - `https://your-app.vercel.app`
   - **Authorized redirect URIs**:
     - `https://your-app.vercel.app/api/auth/callback/google`
7. Copy the Client ID and Client Secret to Vercel

## Step 5: Setup Resend Email (Optional)

1. Go to [resend.com](https://resend.com) and create an account
2. Add and verify your domain (or use their test domain)
3. Go to **API Keys** → **Create API Key**
4. Copy the key to `RESEND_API_KEY` in Vercel
5. Set `EMAIL_FROM` to your verified sender address

## Step 6: Configure GitHub Actions (CI/CD)

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Personal Access Token from [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Find in Vercel → Settings → General |
| `VERCEL_PROJECT_ID` | Find in Vercel → Project → Settings → General |
| `DATABASE_URL` | Same as Vercel |
| `DIRECT_URL` | Same as Vercel |
| `NEXTAUTH_SECRET` | Same as Vercel |

## Step 7: Run Database Migrations

After first deploy, run migrations in Vercel:

```bash
# Option 1: Via Vercel CLI
vercel env pull .env.local
npx prisma db push

# Option 2: Via Vercel Dashboard
# Go to Project → Settings → Functions → Console
# Run: npx prisma db push
```

## Step 8: Deploy

### Automatic Deployment
- Push to `main` branch → Production deployment
- Push to any branch / PR → Preview deployment

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod
```

## Post-Deployment Checklist

- [ ] Visit your app URL and verify it loads
- [ ] Create an admin account via signup
- [ ] Test Google OAuth (if configured)
- [ ] Test email verification (if configured)
- [ ] Create a test event and verify functionality
- [ ] Test real-time leaderboard updates
- [ ] Check that all pages theme correctly

## Custom Domain (Optional)

1. Go to Vercel → Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Google OAuth redirect URIs if using OAuth

## Docker Deployment (Alternative)

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

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `prisma generate` runs in build command

### Database Connection Issues
- Verify `DATABASE_URL` uses pooled connection (`?pgbouncer=true`)
- Check Supabase connection pooler settings

### OAuth Not Working
- Verify redirect URIs match exactly
- Check that both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### Email Not Sending
- Verify Resend API key is valid
- Check that `EMAIL_FROM` domain is verified in Resend

## Scalability (Redis)

If you scale to >1 instance (or use Serverless functions), you **MUST** provide a `REDIS_URL`.
Without Redis, each instance will maintain its own in-memory leaderboard state, leading to inconsistent scores for users connected to different instances.

With `REDIS_URL` configured, the application automatically enables the `Redis` backend for the Hub, syncing state across all nodes instantly.

## Environment Variable Template

Copy this and fill in your values:

```env
# Required
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="your-32-char-secret-key-here"
NEXTAUTH_URL="https://your-app.vercel.app"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"

# Email (optional)
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_VERIFICATION_REQUIRED="true"

# Performance (optional)
REDIS_URL="rediss://default:your-password@your-redis.upstash.io:6379"
LEADERBOARD_CACHE_MS="15000"
ENABLE_LEADERBOARD_CACHE="true"
```
