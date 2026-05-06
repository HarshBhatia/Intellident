# Technology Stack

## Build System

- **Monorepo Manager**: Turborepo
- **Package Manager**: npm@10.2.4 (strict version)
- **Workspaces**: npm workspaces for apps/* and packages/*

## Frontend Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19.2.4 (overridden at root level)
- **Styling**: Tailwind CSS v4 with @tailwindcss/postcss
- **Theming**: next-themes for dark/light mode
- **UI Components**: Lucide Icons for iconography
- **Charts**: Recharts for data visualization
- **PDF Generation**: jspdf with jspdf-autotable

## Backend Stack

- **API**: Next.js API Routes (serverless)
- **Authentication**: Clerk (@clerk/nextjs)
- **Database**: PostgreSQL
  - Production: Neon (cloud)
  - Local: PGlite (@electric-sql/pglite)
  - Connection: @netlify/neon wrapper
- **Query Pattern**: Raw SQL with tagged template literals
- **AI Integration**: Google Gemini (@google/generative-ai)

## Mobile Stack

- **Framework**: Expo / React Native

## Shared Packages

- **@intellident/api**: Database utilities and connection management

## Testing

- **Unit Tests**: Jest with ts-jest
- **E2E Tests**: Playwright
- **Test Utilities**: supertest for API testing

## Code Quality

- **Linting**: ESLint with eslint-config-next
- **Formatting**: Prettier
- **Git Hooks**: Husky (pre-push)
- **TypeScript**: v5

## Common Commands

```bash
# Development
npm run dev              # Start all apps in dev mode
npm run dev -w dashboard # Start specific workspace

# Building
npm run build            # Build all apps
npm run build -w dashboard # Build specific workspace

# Testing
npm run test:unit        # Run unit tests (dashboard)
npm run test:e2e         # Run E2E tests (dashboard)

# Code Quality
npm run lint             # Lint all workspaces
npm run format           # Format code with Prettier

# Database
# Database schema auto-initializes on first request via middleware
```

## Environment Variables

Required in `apps/dashboard/.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GEMINI_API_KEY`
- `DATABASE_URL` (Neon for production, auto-configured for local PGlite)
- `NEXT_PUBLIC_APP_URL`
- `E2E_TEST_SECRET` (optional, for E2E test bypass)

## Deployment

### Platform: Vercel

- **Configuration**: `vercel.json` at root
- **Build Base**: `apps/dashboard`
- **Build Command**: `npm run build --workspace=dashboard`
- **Output Directory**: `apps/dashboard/.next`
- **Region**: Mumbai (bom1)

### Deployment Workflow

1. **Automatic Deployment**
   - Push to `main` branch triggers automatic deployment
   - Vercel builds and deploys via Git integration
   - Build logs available in Vercel dashboard

2. **Manual Deployment**
   ```bash
   vercel --prod
   ```

3. **Preview Deployments**
   ```bash
   vercel  # Creates preview URL
   ```

### Environment Variables

Set in Vercel dashboard (Project Settings > Environment Variables):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `GEMINI_API_KEY` - Google Gemini API key
- `DATABASE_URL` - Neon database connection
- `NEXT_PUBLIC_APP_URL` - Production URL
- `E2E_TEST_SECRET` - Secret for E2E test bypass (optional)

### Database Initialization

Database schema auto-initializes on first request via middleware. No manual initialization required.

### Vercel Configuration

Key settings in `vercel.json`:
- Framework: Next.js
- Region: Mumbai (bom1)
- Build command: `npm run build --workspace=dashboard`
- Install command: `npm install`

### Monitoring & Debugging

- **Function Logs**: Available in Vercel dashboard
- **Deploy Logs**: Available in Vercel dashboard
- **Performance**: Monitor via Vercel Analytics
