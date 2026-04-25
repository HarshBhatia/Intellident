# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Development
npm run dev                        # Start all apps (dashboard :3000, landing :3001)
npm run dev -w dashboard           # Start dashboard only

# Build
npm run build                      # Build all apps via Turborepo
npm run build -w dashboard         # Build dashboard only

# Testing
npm run test:unit                  # Jest unit tests (dashboard)
npm test -w dashboard -- --testPathPattern="patient"  # Run single test file
npm run test:e2e                   # Playwright E2E tests (dashboard)
npm run test:e2e -w dashboard -- --grep "patient"     # Run specific E2E test

# Code Quality
npm run lint                       # ESLint across all workspaces
npm run format                     # Prettier format all files

# Database
npm run seed -w dashboard          # Seed test data (tsx scripts/seed-test-data.ts)
```

## Architecture

**Turborepo monorepo** with npm workspaces:

- `apps/dashboard` — Next.js 16 App Router. Main web app and API. Deployed on Netlify.
- `apps/landing` — Next.js marketing site.
- `apps/mobile` — Expo/React Native patient-facing app.
- `packages/api` — Shared database layer (`getDb()`, types, schema init). Used by dashboard.

### Request Flow (Dashboard API)

1. **Clerk middleware** (`src/middleware.ts`) gates all non-public routes, checks auth, redirects to `/select-clinic` if no `clinic_id` cookie.
2. **API route handlers** use `withAuth()` or `withAuthOnly()` wrappers from `src/lib/api-handler.ts`. These handle auth verification, clinic context, and membership checks automatically.
3. **Service layer** (`src/services/*.service.ts`) contains business logic and SQL queries. Services call `getDb()` from `@intellident/api`.
4. **Database**: `getDb()` returns a tagged template literal SQL function. In production it connects to Neon (PostgreSQL via `@netlify/neon`). Locally it uses PGlite (in-process PostgreSQL at `~/.intellident-pgdata`).

### Multi-Tenancy

Every database query **must** filter by `clinic_id`. The clinic ID comes from a cookie or `x-clinic-id` header. The `withAuth()` wrapper extracts and validates it before passing to handlers.

### Auth Pattern

API routes use two wrappers:
- `withAuth(handler)` — requires authenticated user + valid clinic membership. Handler receives `(request, { userId, userEmail, clinicId })`.
- `withAuthOnly(handler)` — requires authenticated user only (no clinic context). Used for routes like clinic selection.

E2E tests bypass Clerk via `x-e2e-secret` header/cookie with mock user credentials (see `src/lib/auth.ts`).

### Client-Side State

`ClinicProvider` context (`src/context/ClinicContext.tsx`) fetches clinic info and doctors list on mount, provides `useClinic()` hook to all dashboard pages.

### Database Schema

Schema is defined in `packages/api/src/init-db.ts` (`initializeDatabase()`). Tables: `clinics`, `clinic_members`, `patients`, `visits`, `expenses`, `expense_categories`. Schema auto-initializes on first request.

### Key Conventions

- Raw SQL with tagged template literals (`` sql`SELECT ... WHERE clinic_id = ${clinicId}` ``). No ORM.
- Types shared via `packages/api/src/types.ts`, re-exported through `@intellident/api`.
- API routes follow pattern: `src/app/api/[resource]/route.ts` with `withAuth()` wrapper.
- Path alias `@/` maps to `apps/dashboard/src/` in dashboard app.
- Trailing slashes in API routes cause 308 redirects — always omit them.
- Use JOINs over correlated subqueries; push all filtering to SQL, not JavaScript.
- Add composite indexes in `packages/api/src/init-db.ts` when introducing new query patterns.

### E2E Testing

Playwright tests live in `apps/dashboard/test/e2e/`. Config uses Clerk auth state from `playwright/.clerk/user.json`. Global setup in `test/e2e/global-setup.ts`. Dev server auto-starts on port 3000.

### Environment Variables

Required in `apps/dashboard/.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk auth
- `GEMINI_API_KEY` — Google Gemini (AI clinical notes)
- `DATABASE_URL` or `NETLIFY_DATABASE_URL` — Neon PostgreSQL (omit for local PGlite)
- `NEXT_PUBLIC_APP_URL` — App URL

---

## Analytics & Marketing Accounts

This section maps every external account, property, and tool so Claude doesn't rediscover them each session.

### Available MCP Tools

| Tool namespace | What it does |
|---|---|
| `mcp__plugin_toprank_adsagent__*` | Google Ads API — read/write campaigns, keywords, bids, budgets. Use `runScript` for analytics/audits (GAQL fan-out). |
| `mcp__ga4__run_report` | GA4 Data API — website analytics. Params use **snake_case** (protobuf format), not camelCase. |
| `mcp__ga4__run_realtime_report` | GA4 real-time data. |
| `mcp__playwright__*` | Browser automation — scraping, UI testing, screenshots. |
| Vercel MCP | Deployments, env vars, logs. |

---

### Project: Intellident (Dental Management Platform)

**Code**: `/Users/harsh/Code/intellident2/` (this repo)  
**Dashboard URL**: TBD — check Netlify for current deployment  
**Landing URL**: TBD

#### GA4
- **Intellident Dashboard** — Measurement ID `G-1BJ5E2NT8X`
- Tracking tag is in `apps/dashboard/src/app/layout.tsx` via `next/script` (`afterInteractive` strategy)

#### Google Ads
- Not yet set up.

---

### Notes for Claude

- **GA4 API gotcha**: `mcp__ga4__run_report` requires snake_case in all nested objects. Use `dimension_name`, `metric_name`, `order_bys: [{dimension: {dimension_name: "date"}}]` — camelCase fields silently fail or throw "Unknown field" errors.
- **Ads read vs write**: prefer `runScript` with `ads.gaqlParallel([...])` for any analysis/audit (single MCP call, up to 20 queries). Use individual write tools (`pauseKeyword`, `updateBid`, etc.) for mutations — always confirm before executing.
- **Tailwind CDN (dental-clinic site)**: the Play CDN only generates classes it sees statically. Avoid arbitrary values (`w-[85vw]`, `bg-white/10`) and new utility classes not present in the original HTML. Use inline styles or custom CSS in the `<style>` block instead.
- **Edit tool and quotes**: the Edit tool can silently introduce Unicode curly quotes (U+201C/U+201D) in place of ASCII `"`. This breaks HTML attribute parsing. If a section mysteriously loses styling, check for curly quotes with: `python3 -c "d=open('index.html','rb').read(); print(b'\xe2\x80\x9c' in d or b'\xe2\x80\x9d' in d)"`. Fix with binary replacement.
