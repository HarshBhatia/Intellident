# Technology Stack

## Build System

- **Monorepo Manager**: Turborepo
- **Package Manager**: npm@10.2.4 (strict version)
- **Workspaces**: npm workspaces for apps/* and packages/*

## Frontend Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19.1.0 (overridden at root level)
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
- `DATABASE_URL` (Neon for production)
- `NETLIFY_DATABASE_URL` (deployment)
- `NEXT_PUBLIC_APP_URL`

## Deployment

### Platform: Netlify

- **Site**: https://zintellident.netlify.app
- **Admin**: https://app.netlify.com/projects/zintellident
- **Configuration**: `netlify.toml` at root
- **Build Base**: `apps/dashboard`
- **Build Command**: `npm run build`
- **Publish Directory**: `.next`

### Deployment Workflow

1. **Automatic Deployment**
   - Push to `main` branch triggers automatic deployment
   - Netlify builds and deploys via Git integration
   - Build logs available in Netlify dashboard

2. **Manual Deployment**
   ```bash
   cd apps/dashboard
   netlify deploy --prod
   ```

3. **Preview Deployments**
   ```bash
   netlify deploy  # Creates preview URL
   ```

### Environment Variables

Set in Netlify dashboard (Site settings > Environment variables):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `GEMINI_API_KEY` - Google Gemini API key
- `NETLIFY_DATABASE_URL` - Neon database connection (auto-configured via Netlify integration)
- `NEXT_PUBLIC_APP_URL` - Production URL
- `E2E_TEST_SECRET` - Secret for E2E test bypass (optional)

### Database Initialization

After deployment, initialize database indexes:
```bash
curl "https://zintellident.netlify.app/api/init?secret=e2e-secret-key"
```

### Netlify Configuration

Key settings in `netlify.toml`:
- Node.js 20
- Next.js plugin enabled
- Turbopack disabled for stability
- Skew protection enabled
- Static asset caching (1 year)

### Monitoring & Debugging

- **Function Logs**: https://app.netlify.com/projects/zintellident/logs/functions
- **Deploy Logs**: https://app.netlify.com/projects/zintellident/deploys
- **Performance**: Lighthouse runs automatically on each deploy

### Known Issues

**Clerk Middleware on Netlify**
- Next.js 16 + Clerk middleware has compatibility issues with Netlify's serverless runtime
- Middleware properly configured in `src/middleware.ts`
- Auth redirects work correctly (307 to sign-in)
- Protected routes require authentication as expected

### Performance Testing

Run performance checks:
```bash
./performance-test.sh
```

Or use Node.js script:
```bash
node check-performance.js
```
