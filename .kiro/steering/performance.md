# Performance Optimization Guidelines

## Database Query Patterns

### Always Filter in SQL, Not JavaScript

❌ Bad - Fetches all data then filters in memory:
```typescript
const visits = await sql`SELECT * FROM visits WHERE clinic_id = ${clinicId}`;
const filtered = visits.filter(v => v.date >= startDate && v.date <= endDate);
```

✅ Good - Filters at database level:
```typescript
const visits = await sql`
  SELECT * FROM visits 
  WHERE clinic_id = ${clinicId}
  AND date >= ${startDate.toISOString().split('T')[0]}
  AND date <= ${endDate.toISOString().split('T')[0]}
`;
```

### Avoid Correlated Subqueries (N+1 Pattern)

❌ Bad - Runs subquery for each row:
```typescript
SELECT p.*, 
  (SELECT MAX(date) FROM visits WHERE patient_id = p.id) as last_visit
FROM patients p
```

✅ Good - Use JOIN with GROUP BY:
```typescript
SELECT p.*, MAX(v.date) as last_visit
FROM patients p
LEFT JOIN visits v ON v.patient_id = p.id
GROUP BY p.id
```

### Use Composite Indexes for Common Queries

Required indexes are defined in `packages/api/src/init-db.ts`:
- `idx_visits_clinic_patient` - For patient visit lookups
- `idx_visits_clinic_date` - For date-range queries
- `idx_patients_clinic_active` - For active patient lists
- `idx_expenses_clinic_date` - For expense reports

When adding new query patterns, add corresponding indexes.

## Connection Management

### Neon Connection Pooling

The `@intellident/api` package enables connection pooling via `neonConfig.fetchConnectionCache = true`. This reuses connections across serverless function invocations on Netlify.

Do not create multiple `getDb()` instances in a single request - reuse the same connection.

## Serverless Optimization

### Cold Start Mitigation

- Keep dependencies minimal in API routes
- Use dynamic imports for heavy libraries only when needed
- Avoid large JSON parsing in hot paths

### Response Size

- Paginate large result sets
- Only select columns you need (avoid `SELECT *`)
- Use `LIMIT` clauses for list endpoints

### Caching Strategy

For read-heavy endpoints, consider:
- Next.js route segment config: `export const revalidate = 60`
- HTTP Cache-Control headers for static data
- Client-side SWR/React Query for frequently accessed data

### Implemented Caching

1. **Clinic Endpoint** (`/api/clinic`)
   - Revalidation: 60 seconds
   - Cache-Control: `public, s-maxage=60, stale-while-revalidate=120`
   - Rationale: Clinic information rarely changes

2. **Patients List Endpoint** (`/api/patients`)
   - Revalidation: 30 seconds
   - Cache-Control: `public, s-maxage=30, stale-while-revalidate=60`
   - Optimized query with LEFT JOIN instead of correlated subquery
   - Performance logging enabled for monitoring

3. **Clinic Members Endpoint** (`/api/clinic/members`)
   - Revalidation: 60 seconds
   - Cache-Control: `public, s-maxage=60, stale-while-revalidate=120`
   - Supports `?role=DOCTOR` query parameter for filtering
   - Returns both DOCTOR and OWNER roles when filtered

## Common Anti-Patterns to Avoid

1. **Fetching all records then filtering** - Always push filters to SQL
2. **N+1 queries** - Use JOINs or batch queries with Promise.all
3. **Missing indexes** - Add indexes for WHERE, JOIN, and ORDER BY columns
4. **Large payload transfers** - Paginate and limit result sets
5. **Synchronous sequential queries** - Use Promise.all for independent queries
6. **Trailing slashes in API routes** - Always use `/api/endpoint` not `/api/endpoint/` to avoid 308 redirects
7. **Unnecessary prefetching** - Disable prefetch on rarely-clicked links with `prefetch={false}`

## Monitoring Performance

When debugging slow queries:
1. Check Netlify function logs for execution time
2. Add timing logs: `console.time('query')` / `console.timeEnd('query')`
3. Use `EXPLAIN ANALYZE` in Neon console for query plans
4. Monitor Neon dashboard for slow queries

## Local vs Production Performance

Local (PGlite) is always faster because:
- In-process database (no network latency)
- Persistent connections
- No cold starts

Production (Neon on Vercel) requires:
- Connection pooling (enabled)
- Proper indexes (defined in packages/api/src/init-db.ts)
- SQL-level filtering (not JavaScript)
- Optimized query patterns (JOINs over subqueries)
