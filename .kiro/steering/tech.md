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
# Visit http://localhost:3000/api/init to initialize local schema
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

- **Platform**: Netlify (configured in apps/dashboard/.netlify/)
- **Build Command**: `npm run build`
