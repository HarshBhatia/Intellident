# Project Structure

## Monorepo Organization

```
intellident-monorepo/
├── apps/                    # Application workspaces
│   ├── dashboard/          # Main web application (Next.js 16)
│   ├── landing/            # Marketing/public website
│   └── mobile/             # Patient mobile app (Expo/React Native)
├── packages/               # Shared packages
│   └── api/                # Database utilities and connection management
├── .kiro/                  # Kiro AI assistant configuration
│   └── steering/           # Project guidance documents
├── .husky/                 # Git hooks configuration
├── turbo.json              # Turborepo configuration
└── package.json            # Root workspace configuration
```

## Dashboard App Structure

```
apps/dashboard/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   └── init/       # Database schema initialization
│   │   ├── (routes)/       # Page routes
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   ├── lib/                # Utility functions
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
├── .env.local              # Local environment variables
└── package.json            # Dashboard dependencies
```

## API Package Structure

```
packages/api/
├── src/
│   └── index.ts            # Exports getDb() and database utilities
└── package.json
```

## Key Conventions

### File Organization

- **API Routes**: Place in `apps/dashboard/src/app/api/[route]/route.ts`
- **Components**: Organize by feature or shared in `apps/dashboard/src/components/`
- **Database Logic**: Centralize in `packages/api/src/`
- **Types**: All types centralized in `packages/api/src/types.ts` and re-exported via `apps/dashboard/src/types.ts`

### Naming Conventions

- **Files**: kebab-case for files and folders (`patient-list.tsx`)
- **Components**: PascalCase for React components (`PatientList`)
- **API Routes**: RESTful naming (`/api/patients`, `/api/visits`)
- **Database Tables**: snake_case (`clinic_members`, `patient_visits`)

### Import Patterns

- Use workspace aliases: `@intellident/api` for shared packages
- Relative imports within the same app
- Always import `getDb()` from `@intellident/api` for database access

### Database Schema Management

- **Source of Truth**: `packages/api/src/init-db.ts`
- **Auto-initialization**: Database schema is automatically initialized on first request via middleware
- **Manual initialization**: Run `initializeDatabase()` from `packages/api` if needed

## Multi-Tenant Data Isolation

All database queries MUST follow this pattern:

```typescript
const db = await getDb();
const result = await db.query(
  sql`SELECT * FROM patients WHERE clinic_id = ${clinicId}`
);
```

### Security Pattern for API Routes

1. Verify authentication: `auth().userId`
2. Verify clinic context: `clinic_id` cookie exists
3. Verify membership: `verifyMembership(clinicId, userEmail)`
4. Filter all queries by `clinic_id`

## Testing Structure

- **Unit Tests**: Co-locate with source files or in `__tests__/` directories
- **E2E Tests**: Playwright tests in `apps/dashboard/test/e2e/` covering authentication, patient management, visits, expenses, and treatments
  - Test user must be created manually before running tests
  - Use `signIn()` helper from `test/e2e/helpers/auth.ts` for authentication
  - Run with `npm run test:e2e -w dashboard`
- **Manual Testing**: Use development environment with test clinics

## Configuration Files

- **TypeScript**: `tsconfig.json` in each workspace
- **ESLint**: Extends `eslint-config-next`
- **Tailwind**: `tailwind.config.js` in dashboard app
- **Turbo**: `turbo.json` at root for build orchestration
