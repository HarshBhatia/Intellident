# Complete Vercel Setup Guide

## Current Status

✅ Vercel CLI installed and logged in
✅ Project created and linked
✅ Environment variables set for production:
   - CLERK_SECRET_KEY
   - GEMINI_API_KEY
   - DATABASE_URL
   - E2E_TEST_SECRET
   - NEXT_PUBLIC_APP_URL (placeholder)
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

❌ Deployment failing due to monorepo structure

## Problem

The CLI deployment from `apps/dashboard` subdirectory doesn't work well with npm workspaces. Vercel needs to install dependencies from the root.

## Solution: Connect GitHub Repository (Recommended)

### Step 1: Push Your Code to GitHub

```bash
# If not already done
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Connect GitHub to Vercel

1. Go to https://vercel.com/harshbhatias-projects/dashboard/settings/git
2. Click "Connect Git Repository"
3. Select your GitHub repository
4. Configure the project:
   - **Root Directory**: Leave empty (Vercel will detect monorepo)
   - **Framework Preset**: Next.js
   - **Build Command**: `cd apps/dashboard && npm run build`
   - **Output Directory**: `apps/dashboard/.next`
   - **Install Command**: `npm install`

### Step 3: Deploy

Once connected, Vercel will automatically:
- Deploy on every push to `main`
- Create preview deployments for pull requests
- Handle the monorepo structure correctly

## Alternative: Manual Vercel Dashboard Setup

If you prefer not to use GitHub:

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select "Import Git Repository"
4. Choose your repo
5. Configure as above

## After First Successful Deployment

### 1. Update NEXT_PUBLIC_APP_URL

```bash
# Get your deployment URL from Vercel dashboard
# Then update the environment variable

cd apps/dashboard
vercel env rm NEXT_PUBLIC_APP_URL production
echo "https://your-actual-url.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

# Redeploy
vercel --prod
```

### 2. Initialize Database

```bash
curl "https://your-actual-url.vercel.app/api/init?secret=e2e-secret-key"
```

### 3. Update Clerk URLs

In Clerk Dashboard (https://dashboard.clerk.com):

**Paths**:
- Sign-in URL: `https://your-vercel-url.vercel.app/sign-in`
- Sign-up URL: `https://your-vercel-url.vercel.app/sign-up`
- After sign-in: `https://your-vercel-url.vercel.app/`
- After sign-up: `https://your-vercel-url.vercel.app/`

**Allowed Origins**:
- Add: `https://your-vercel-url.vercel.app`
- Add: `https://*.vercel.app` (for previews)

### 4. Test Your Application

1. Visit your Vercel URL
2. Sign in with Clerk
3. Create a test patient
4. Verify all features work

## Vercel Project Settings

Your project is configured at:
https://vercel.com/harshbhatias-projects/dashboard

### Current Configuration

- **Project Name**: dashboard
- **Framework**: Next.js
- **Region**: Mumbai (bom1)
- **Node Version**: 20.x (default)

### Recommended Settings

Go to Settings → General:

1. **Build & Development Settings**:
   - Build Command: `npm run build --workspace=dashboard`
   - Output Directory: `apps/dashboard/.next`
   - Install Command: `npm install`
   - Development Command: `npm run dev`

2. **Root Directory**: Leave empty (monorepo auto-detection)

3. **Node.js Version**: 20.x

4. **Environment Variables**: Already set ✅

## Troubleshooting

### Build Still Failing?

Check the build logs at:
https://vercel.com/harshbhatias-projects/dashboard/deployments

Common issues:
1. **Missing dependencies**: Ensure all packages are in package.json
2. **TypeScript errors**: Run `npm run build` locally first
3. **Environment variables**: Verify all are set correctly

### Database Connection Issues?

- Verify `DATABASE_URL` is correct
- Check Neon dashboard for connection string
- Ensure database is not paused

### Clerk Authentication Not Working?

- Verify Clerk URLs are updated
- Check environment variables are set
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is visible

## Performance Monitoring

After deployment, monitor:
- **Vercel Analytics**: https://vercel.com/harshbhatias-projects/dashboard/analytics
- **Function Logs**: https://vercel.com/harshbhatias-projects/dashboard/logs
- **Neon Dashboard**: Check database performance

## Next Steps

1. ✅ Connect GitHub repository to Vercel
2. ✅ Push code and let Vercel auto-deploy
3. ✅ Update NEXT_PUBLIC_APP_URL after deployment
4. ✅ Initialize database indexes
5. ✅ Update Clerk redirect URLs
6. ✅ Test application thoroughly
7. ✅ Add custom domain (optional)
8. ✅ Remove Netlify files and configuration

## Rollback to Netlify

If needed, you can always rollback:
1. Netlify is still active at https://zintellident.netlify.app
2. Just update DNS back to Netlify
3. Update Clerk URLs back to Netlify

## Support

- Vercel Discord: https://vercel.com/discord
- Vercel Docs: https://vercel.com/docs
- Your project: https://vercel.com/harshbhatias-projects/dashboard

---

**Status**: Ready for GitHub connection and deployment
**Next Action**: Connect your GitHub repository to Vercel
