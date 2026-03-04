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
- **Types**: Define in `apps/dashboard/src/types/` or co-locate with features

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

- **Source of Truth**: `apps/dashboard/src/app/api/init/route.ts`
- **Schema Updates**: Add SQL to init route and run endpoint
- **Local Setup**: Visit `http://localhost:3000/api/init` after installation

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
- **E2E Tests**: Place in `apps/dashboard/tests/` or `e2e/`
- **Test Data**: Use `E2E_TEST_SECRET` for E2E authentication bypass

## Configuration Files

- **TypeScript**: `tsconfig.json` in each workspace
- **ESLint**: Extends `eslint-config-next`
- **Tailwind**: `tailwind.config.js` in dashboard app
- **Turbo**: `turbo.json` at root for build orchestration
