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
│   │   │   ├── appointments/  # Appointment management
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── clinic/        # Clinic info and members
│   │   │   ├── expenses/      # Expense tracking
│   │   │   ├── generate-notes/ # AI note generation
│   │   │   ├── health/        # Health check
│   │   │   ├── patients/      # Patient management
│   │   │   └── visits/        # Visit records
│   │   ├── earnings/       # Earnings page
│   │   ├── expenses/       # Expenses page
│   │   ├── patients/       # Patient management pages
│   │   ├── scheduler/      # Appointment scheduler
│   │   ├── select-clinic/  # Clinic selection
│   │   ├── settings/       # Settings page
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── services/           # Business logic layer
│   ├── middleware.ts       # Next.js middleware (auth)
│   └── types.ts            # TypeScript type definitions
├── public/                 # Static assets
├── .env.local              # Local environment variables
└── package.json            # Dashboard dependencies
```

## API Package Structure

```
packages/api/
├── src/
│   ├── db.ts               # Database connection (getDb)
│   ├── image-utils.ts      # Image processing utilities
│   ├── index.ts            # Package exports
│   ├── init-db.ts          # Database schema initialization
│   └── types.ts            # Shared TypeScript types
└── package.json
```

## Key Conventions

### File Organization

- **API Routes**: Place in `apps/dashboard/src/app/api/[route]/route.ts`
- **Components**: Organize by feature or shared in `apps/dashboard/src/components/`
- **Business Logic**: Service layer in `apps/dashboard/src/services/`
- **Database Logic**: Connection and initialization in `packages/api/src/`
- **Types**: All types centralized in `packages/api/src/types.ts` and re-exported via `apps/dashboard/src/types.ts`
- **Context**: React context providers in `apps/dashboard/src/context/`
- **Hooks**: Custom React hooks in `apps/dashboard/src/hooks/`

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

### Service Layer Pattern

Business logic is organized in service modules in `apps/dashboard/src/services/`:
- `appointment.service.ts` - Appointment scheduling and management
- `clinic.service.ts` - Clinic information and member management
- `expense.service.ts` - Expense tracking and categories
- `import.service.ts` - Data import functionality
- `patient.service.ts` - Patient CRUD operations
- `stats.service.ts` - Dashboard statistics and analytics
- `treatment.service.ts` - Treatment catalog management
- `visit.service.ts` - Visit records and history

API routes should delegate to service functions for consistency and testability.

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
