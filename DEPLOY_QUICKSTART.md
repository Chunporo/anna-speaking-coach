# 🚀 Quick Deployment Guide

This is a simplified guide for the fastest deployment options.

## Option 1: Vercel + Railway (Recommended - Easiest)

### Step 1: Deploy Frontend to Vercel (5 minutes)

1. **Push your code to GitHub** (make sure all changes are committed)

2. **Go to [vercel.com](https://vercel.com)** and sign up/login

3. **Click "New Project"** → Import your GitHub repo

4. **⚠️ IMPORTANT: Set Root Directory**
   - In the project configuration page, look for **"Root Directory"** section
   - Click **"Edit"** next to Root Directory
   - Select or type: `frontend`
   - Click **"Continue"**
   - ⚠️ **This is critical!** Without this, Vercel will try to build from root and fail.

5. **Configure Project:**
   - Framework Preset: Next.js (should auto-detect)
   - Build Command: `npm run build` (should auto-detect)
   - Output Directory: `.next` (should auto-detect)
   - Install Command: `npm install` (should auto-detect)

6. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   ```
   (You'll update NEXT_PUBLIC_API_URL after deploying the backend)

7. **Click "Deploy"** ✅

**If you see module resolution errors, double-check that Root Directory is set to `frontend`!**

### Step 2: Deploy Backend to Railway (10 minutes)

1. **Go to [railway.app](https://railway.app)** and sign up

2. **Click "New Project"** → "Deploy from GitHub repo"

3. **Select your repo** and set **Root Directory** to `backend`
   - Railway should detect Python from `requirements.txt`
   - The project includes `Procfile` and `railway.json` for auto-configuration

4. **Add PostgreSQL database:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create a `DATABASE_URL` environment variable

5. **Configure the service:**
   - Go to your service → "Settings" tab
   - Under "Deploy", verify:
     - **Start Command:** Should auto-detect as `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - If not, set it manually
   - Under "Healthcheck":
     - **Healthcheck Path:** `/api/health` (optional, but recommended)

6. **Add Environment Variables:**
   Go to "Variables" tab and add:
   ```
   DATABASE_URL=postgresql://... (auto-added by Railway when you add PostgreSQL)
   SECRET_KEY=generate-with-openssl-rand-hex-32
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ENVIRONMENT=production
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```
   (Update ALLOWED_ORIGINS after frontend is deployed)

7. **Deploy!** Railway will:
   - Install dependencies from `requirements.txt`
   - Start your FastAPI app
   - Give you a URL (e.g., `https://your-app.up.railway.app`)

**Note:** The project includes `Procfile` and `railway.json` which tell Railway how to build and run your app automatically.

### Step 3: Initialize Database

1. Go to Railway dashboard → Your PostgreSQL database
2. Copy connection string
3. Run:
   ```bash
   psql $DATABASE_URL < backend/database/schema.sql
   psql $DATABASE_URL < backend/database/seed_data.sql
   ```

### Step 4: Update Frontend URL in Railway

1. Go back to Railway backend settings
2. Update `ALLOWED_ORIGINS` with your actual Vercel URL
3. Redeploy

**Done!** 🎉

---

## Option 2: Docker Compose (Local/Server)

### Quick Start

1. **Create `.env` file** in project root:
   ```env
   SECRET_KEY=your-secret-key-here
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ALLOWED_ORIGINS=http://localhost:3000
   ```

2. **Start everything:**
   ```bash
   docker-compose up -d
   ```

3. **Access:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

**Done!** 🎉

---

## Option 3: One-Click Deploy to Render

### Backend on Render

1. Go to [render.com](https://render.com)
2. "New" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - **Build Command:** `cd backend && pip install -r requirements.txt`
   - **Start Command:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3
5. Add PostgreSQL database
6. Add environment variables
7. Deploy ✅

### Frontend on Render

1. "New" → "Web Service"
2. Settings:
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Start Command:** `cd frontend && npm start`
   - **Environment:** Node
3. Add environment variables
4. Deploy ✅

---

## Generate Secret Key

```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## Troubleshooting

### Railway: "Railpack could not determine how to build the app"

**Solution:**
1. Make sure you set **Root Directory** to `backend` in Railway project settings
2. Verify these files exist in your `backend` directory:
   - ✅ `requirements.txt`
   - ✅ `Procfile` (created automatically)
   - ✅ `railway.json` (created automatically)
3. Check Railway Settings → Deploy:
   - **Start Command** should be: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - If missing, set it manually
4. Redeploy the service

### Vercel Build Errors: "Module not found: Can't resolve '@/lib/api'"

**This means Vercel is building from the wrong directory!**

**Fix:**
1. Go to your Vercel project dashboard
2. Click **"Settings"** tab
3. Click **"General"** in the left sidebar
4. Scroll down to **"Root Directory"**
5. Click **"Edit"**
6. Change from `/` (root) to `frontend`
7. Click **"Save"**
8. Go to **"Deployments"** tab
9. Click the **"..."** menu on the latest deployment
10. Click **"Redeploy"**

The build should now succeed! ✅

### Frontend can't connect to backend:
- Check `NEXT_PUBLIC_API_URL` matches your backend URL
- Verify CORS settings include your frontend URL

### Database errors:
- Check `DATABASE_URL` format is correct
- Verify database is running and accessible

### Google OAuth not working:
- Update Google Console with production URLs
- Check environment variables are set correctly

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

