# LLM Guide to IntelliDent Repo

This guide helps Large Language Models understand the context and conventions of the `intellident2` repository to generate accurate and safe code.

## Repository Overview
- **Monorepo:** Uses TurboRepo (`apps/` and `packages/`).
- **Main App:** `apps/dashboard` (Next.js 16).
- **Mobile App:** `apps/mobile` (Expo/React Native).
- **Shared Lib:** `packages/api` (Database connection).

## Critical Conventions

### 1. Database Interactions
- **ALWAYS** use `getDb()` from `@intellident/api`.
- **ALWAYS** use tagged template literals (`sql`... ``) for queries to prevent SQL injection.
- **NEVER** assume an ORM like Prisma is active. We use **Raw SQL**.
- **Multi-tenancy:** You **MUST** filter all queries by `clinic_id`.
  - *Wrong:* `SELECT * FROM patients`
  - *Correct:* `SELECT * FROM patients WHERE clinic_id = ${clinicId}`

### 2. Authentication & Security
- We use Clerk (`@clerk/nextjs`).
- API Routes must verify:
  1. `auth().userId` (exists)
  2. `cookies().get('clinic_id')` (exists)
  3. `verifyMembership(clinicId, userEmail)` (returns true)

### 3. Frontend Architecture
- **Tailwind CSS v4:** Use v4 syntax (no `tailwind.config.js`, pure CSS configuration).
- **Client vs Server:**
  - API Routes (`/api/...`) handle DB logic.
  - Page components (`page.tsx`) should be server components where possible, or wrap client logic (`ClientComponent.tsx`).
  - Use `Suspense` for loading states.

### 4. Type Definitions
- Check `apps/dashboard/src/types.ts` for frontend interfaces (`Patient`, `PaymentRecord`).
- Check `packages/api/src/types.ts` for shared types.

### 5. Common Tasks
- **Adding a Column:** Update `apps/dashboard/src/app/api/init/route.ts` with the new column definition and run the init endpoint (or guide the user to).
- **New Feature:**
  1. Create API route in `apps/dashboard/src/app/api/new-feature/route.ts`.
  2. Secure it with the Auth Pattern.
  3. Create Frontend Client Component.
  4. Update Types.

## File Structure Context
- `apps/dashboard/src/lib/db.ts`: DB Connection wrapper.
- `apps/dashboard/src/app/api/init/route.ts`: **Source of Truth** for DB Schema.
