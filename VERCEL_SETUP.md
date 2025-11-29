# Vercel Deployment Setup

## ⚠️ CRITICAL: Root Directory Configuration

Your Next.js app is in the `frontend/` subdirectory. **You MUST configure Vercel to use `frontend` as the root directory**, otherwise the build will fail with "Module not found" errors.

## Steps to Fix:

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Scroll down to **Root Directory**
5. Click **Edit**
6. Select or type: `frontend`
7. Click **Save**
8. **Redeploy** your project

## Why This Is Needed:

- Vercel needs to know where your Next.js app is located
- Without this setting, Vercel tries to build from the repository root
- The `@/lib/` path aliases won't resolve correctly when building from root
- The `tsconfig.json` and `next.config.js` are in the `frontend/` directory

## Current Configuration:

The `vercel.json` in the repository root is configured to build from `frontend/`, but Vercel's root directory setting takes precedence. Both must be set correctly for the build to succeed.

## After Setting Root Directory:

Once you set the root directory to `frontend` in Vercel settings:
- Vercel will automatically use the `frontend/vercel.json` (if it exists) or the root `vercel.json`
- The build will run from the `frontend/` directory
- Path aliases like `@/lib/api` will resolve correctly
- The build should succeed

