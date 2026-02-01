# Live Leaderboard

Real-time leaderboard system for hackathons, competitions, and live events.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Real-time Updates** - Live score updates via Server-Sent Events
- **Multi-tenant** - Host multiple events with unique URLs
- **Judge Console** - Streamlined scoring interface for judges
- **Custom Rubrics** - Visual rubric designer with weighted criteria
- **Stage Display** - Full-screen projector mode with podium animations
- **QR Registration** - Quick participant onboarding
- **Google OAuth** - Secure authentication with email verification
- **Responsive** - Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth.js (Credentials + Google OAuth)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/liveleaderboard.git
cd liveleaderboard
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Setup database
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env` file with:

```env
# Database (Required)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth (Required)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email (Optional)
RESEND_API_KEY=""
EMAIL_FROM="noreply@yourdomain.com"
```

See [.env.example](.env.example) for all options.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:reset:seed # Reset database with demo data
```

## Project Structure

```
├── app/                  # Next.js App Router pages
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Admin dashboard
│   └── e/[eventSlug]/    # Event pages (public, admin, judge)
├── components/           # React components
├── lib/                  # Utilities and configurations
├── prisma/               # Database schema
└── tests/                # Test files
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue first to discuss changes.
