# Vercel Migration Guide

This guide will help you migrate from Netlify to Vercel.

## Prerequisites

- GitHub repository connected
- Vercel account (sign up at https://vercel.com)
- Access to your Neon database

## Step 1: Install Vercel CLI (Optional)

```bash
npm i -g vercel
vercel login
```

## Step 2: Create Vercel Project

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select the root directory
4. Framework Preset: **Next.js**
5. Root Directory: `apps/dashboard`
6. Build Command: `npm run build`
7. Output Directory: `.next`
8. Install Command: `npm install`

### Option B: Via CLI

```bash
# From project root
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: intellident
# - Directory: apps/dashboard
# - Override settings? No
```

## Step 3: Configure Environment Variables

Add these in Vercel Dashboard (Settings → Environment Variables):

### Required Variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google Gemini AI
GEMINI_API_KEY=AIza...

# Neon Database
DATABASE_URL=postgresql://...

# App URL (update after first deploy)
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app

# E2E Testing (optional)
E2E_TEST_SECRET=e2e-secret-key
```

### How to Add:
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add each variable for **Production**, **Preview**, and **Development**
4. Click "Save"

## Step 4: Update Database Connection (Optional)

Your current `@netlify/neon` wrapper works fine, but you can simplify:

### Current (works on Vercel):
```typescript
// packages/api/src/index.ts
import { neon } from '@netlify/neon';
```

### Simplified (Vercel-optimized):
```typescript
// packages/api/src/index.ts
import { neon } from '@neondatabase/serverless';

export function getDb() {
  return neon(process.env.DATABASE_URL!);
}
```

To switch:
```bash
npm uninstall @netlify/neon
npm install @neondatabase/serverless
```

## Step 5: Deploy

### First Deployment:

```bash
# Via CLI
vercel --prod

# Or push to main branch (auto-deploys)
git push origin main
```

### After Deployment:

1. **Initialize Database Indexes**:
   ```bash
   curl "https://your-project.vercel.app/api/init?secret=e2e-secret-key"
   ```

2. **Update Environment Variable**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
   - Redeploy: `vercel --prod`

3. **Test the Application**:
   - Visit your Vercel URL
   - Sign in with Clerk
   - Create/view patients
   - Test all features

## Step 6: Custom Domain (Optional)

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., `intellident.com`)
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain
5. Update Clerk redirect URLs to your custom domain

## Step 7: Update Clerk URLs

In Clerk Dashboard (https://dashboard.clerk.com):

1. Go to your application
2. **Paths** section:
   - Update Sign-in URL: `https://your-vercel-url.vercel.app/sign-in`
   - Update Sign-up URL: `https://your-vercel-url.vercel.app/sign-up`
   - Update After sign-in URL: `https://your-vercel-url.vercel.app/`
   - Update After sign-up URL: `https://your-vercel-url.vercel.app/`

3. **Allowed Origins**:
   - Add: `https://your-vercel-url.vercel.app`
   - Add: `https://*.vercel.app` (for preview deployments)

## Step 8: Cleanup (After Successful Migration)

Once everything works on Vercel:

```bash
# Remove Netlify files
rm -rf .netlify
rm netlify.toml

# Commit changes
git add .
git commit -m "Migrate to Vercel"
git push origin main
```

## Troubleshooting

### Build Fails

**Error**: "Cannot find module '@netlify/neon'"
**Solution**: Either install `@neondatabase/serverless` or keep `@netlify/neon` (it works on Vercel)

### Middleware Issues

**Error**: Clerk middleware not working
**Solution**: Vercel has better Next.js 16 support, should work out of the box

### Database Connection

**Error**: "Connection timeout"
**Solution**: 
- Verify `DATABASE_URL` is set correctly
- Check Neon dashboard for connection string
- Ensure database is not paused

### Environment Variables Not Loading

**Solution**:
- Ensure variables are set for correct environment (Production/Preview/Development)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

## Performance Comparison

After migration, you should see:
- ✅ Faster cold starts (~500ms vs ~1s)
- ✅ Better Next.js 16 compatibility
- ✅ Improved middleware performance
- ✅ Faster builds with Turbopack
- ✅ Better caching

## Rollback Plan

If you need to rollback:
1. Keep Netlify deployment active during testing
2. Switch DNS back to Netlify
3. Update Clerk URLs back to Netlify

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Next.js Docs: https://nextjs.org/docs

## Cost Comparison

### Netlify Pro: $19/month
- 1,000 build minutes
- 100GB bandwidth
- 125k serverless function requests

### Vercel Pro: $20/month
- 6,000 build minutes
- 1TB bandwidth
- 1M serverless function executions
- Better Next.js support

## Next Steps

1. ✅ Create Vercel project
2. ✅ Add environment variables
3. ✅ Deploy to Vercel
4. ✅ Initialize database
5. ✅ Test application
6. ✅ Update Clerk URLs
7. ✅ Add custom domain (optional)
8. ✅ Cleanup Netlify files

---

**Migration Status**: Ready to deploy!
**Estimated Time**: 30-60 minutes
**Risk Level**: Low (can keep Netlify as backup)
