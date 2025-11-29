# 🚀 Deployment Guide

This guide covers multiple deployment options for your IELTS Speaking Practice Platform.

## Table of Contents

1. [Recommended: Vercel (Frontend) + Railway/Render (Backend)](#recommended-vercel--railwayrender)
2. [Option 2: Docker Deployment](#option-2-docker-deployment)
3. [Option 3: Traditional VPS (Ubuntu/Debian)](#option-3-traditional-vps)
4. [Option 4: AWS/GCP/Azure](#option-4-cloud-providers)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Recommended: Vercel + Railway/Render

This is the easiest and most cost-effective option for beginners.

### Frontend: Deploy to Vercel

1. **Push your code to GitHub** (if not already done)

2. **Go to [Vercel](https://vercel.com)** and sign up/login

3. **Import your repository**
   - Click "New Project"
   - Select your GitHub repository

4. **⚠️ CRITICAL: Set Root Directory**
   - In the configuration page, find **"Root Directory"** section
   - Click **"Edit"** 
   - Select or type: `frontend`
   - Click **"Continue"**
   - ⚠️ **This step is essential!** Without it, Vercel will try to build from root and you'll get "Module not found" errors.

5. **Configure Project Settings:**
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)

6. **Configure Environment Variables**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   ```
   (You can update NEXT_PUBLIC_API_URL after backend is deployed)

7. **Deploy!** Vercel will automatically:
   - Build your Next.js app from the `frontend` directory
   - Deploy it
   - Give you a URL (e.g., `https://your-app.vercel.app`)

**If you already created the project and see build errors:**
- Go to Project Settings → General → Root Directory
- Change it to `frontend`
- Redeploy

### Backend: Deploy to Railway

1. **Go to [Railway](https://railway.app)** and sign up

2. **Create New Project** → "Deploy from GitHub repo"

3. **Select your repository** and set Root Directory to `backend`

4. **Add PostgreSQL Database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create a `DATABASE_URL` environment variable

5. **Set Environment Variables**
   ```env
   DATABASE_URL=postgresql://...  # Auto-added by Railway
   SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ENVIRONMENT=production
   ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
   ```

6. **Configure Start Command**
   - Go to Settings → Deploy
   - Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

7. **Deploy!** Railway will:
   - Build your FastAPI app
   - Run migrations (you may need to do this manually)
   - Give you a URL (e.g., `https://your-app.up.railway.app`)

8. **Initialize Database**
   - Go to your Railway PostgreSQL database
   - Copy connection string
   - Run migrations:
   ```bash
   psql $DATABASE_URL < backend/database/schema.sql
   psql $DATABASE_URL < backend/database/seed_data.sql
   ```

### Alternative Backend: Render.com

1. **Go to [Render](https://render.com)** and sign up

2. **Create New Web Service** → Connect GitHub repo

3. **Configure:**
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3

4. **Add PostgreSQL Database:**
   - Create a new PostgreSQL database
   - Render will add `DATABASE_URL` automatically

5. **Set Environment Variables** (same as Railway)

6. **Deploy!**

---

## Option 2: Docker Deployment

### Create Dockerfile for Backend

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Create Dockerfile for Frontend

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Create docker-compose.yml

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: ielts_user
      POSTGRES_PASSWORD: ielts_password
      POSTGRES_DB: ielts_speaking
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ielts_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://ielts_user:ielts_password@db:5432/ielts_speaking
      SECRET_KEY: ${SECRET_KEY}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      ENVIRONMENT: production
      ALLOWED_ORIGINS: ${FRONTEND_URL}
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: ${BACKEND_URL}
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Update next.config.js for Docker

Update `frontend/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker
}

module.exports = nextConfig
```

### Deploy with Docker

```bash
# Build and start all services
docker-compose up -d

# Initialize database
docker-compose exec db psql -U ielts_user -d ielts_speaking < backend/database/schema.sql
docker-compose exec db psql -U ielts_user -d ielts_speaking < backend/database/seed_data.sql

# View logs
docker-compose logs -f
```

---

## Option 3: Traditional VPS

For deploying on a VPS like DigitalOcean, Linode, or AWS EC2.

### 1. Server Setup (Ubuntu 20.04/22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL console:
CREATE DATABASE ielts_speaking;
CREATE USER ielts_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE ielts_speaking TO ielts_user;
\q

# Run migrations
sudo -u postgres psql ielts_speaking < backend/database/schema.sql
sudo -u postgres psql ielts_speaking < backend/database/seed_data.sql
```

### 3. Deploy Backend

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-username/english_speaking_test.git
cd english_speaking_test/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
sudo nano .env
# Add your environment variables

# Create systemd service
sudo nano /etc/systemd/system/ielts-backend.service
```

Service file content:
```ini
[Unit]
Description=IELTS Backend API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/english_speaking_test/backend
Environment="PATH=/var/www/english_speaking_test/backend/venv/bin"
ExecStart=/var/www/english_speaking_test/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ielts-backend
sudo systemctl start ielts-backend
sudo systemctl status ielts-backend
```

### 4. Deploy Frontend

```bash
cd /var/www/english_speaking_test/frontend

# Install dependencies
npm install

# Build production version
npm run build

# Create .env.local
sudo nano .env.local
# Add environment variables

# Create systemd service
sudo nano /etc/systemd/system/ielts-frontend.service
```

Service file content:
```ini
[Unit]
Description=IELTS Frontend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/english_speaking_test/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable ielts-frontend
sudo systemctl start ielts-frontend
```

### 5. Configure Nginx

Create `/etc/nginx/sites-available/ielts`:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase upload size for audio files
    client_max_body_size 50M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ielts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## Option 4: Cloud Providers

### AWS (Elastic Beanstalk + RDS)

1. **Create RDS PostgreSQL instance**
2. **Deploy backend to Elastic Beanstalk**
3. **Deploy frontend to S3 + CloudFront**

### Google Cloud Platform

1. **Use Cloud SQL for PostgreSQL**
2. **Deploy backend to Cloud Run**
3. **Deploy frontend to Cloud Run or Firebase Hosting**

### Azure

1. **Use Azure Database for PostgreSQL**
2. **Deploy backend to Azure App Service**
3. **Deploy frontend to Azure Static Web Apps**

---

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/ielts_speaking

# Security
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Environment
ENVIRONMENT=production

# CORS
ALLOWED_ORIGINS=https://your-frontend-url.com

# Optional: Google Cloud Services
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json  # If using Google Speech API
GEMINI_API_KEY=your-gemini-api-key  # If using Gemini for feedback
```

### Frontend (.env.local)

```env
# API URL
NEXT_PUBLIC_API_URL=https://your-backend-url.com

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Post-Deployment Checklist

### 1. Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized JavaScript origins:
   - `https://your-frontend-url.com`
5. Add authorized redirect URIs:
   - `https://your-frontend-url.com`

### 2. Verify Database

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

### 3. Test API Endpoints

```bash
# Health check
curl https://your-backend-url.com/api/health

# Test CORS
curl -H "Origin: https://your-frontend-url.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-backend-url.com/api/cors-test
```

### 4. Monitor Logs

**Railway/Render:**
- Check logs in dashboard

**VPS:**
```bash
# Backend logs
sudo journalctl -u ielts-backend -f

# Frontend logs
sudo journalctl -u ielts-frontend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### 5. Set Up Backups

```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > $BACKUP_DIR/ielts_speaking_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

### 6. Enable File Uploads

Make sure the `uploads` directory is writable:
```bash
sudo mkdir -p /var/www/english_speaking_test/backend/uploads/audio
sudo mkdir -p /var/www/english_speaking_test/backend/uploads/tts
sudo chown -R www-data:www-data /var/www/english_speaking_test/backend/uploads
sudo chmod -R 755 /var/www/english_speaking_test/backend/uploads
```

### 7. Security Hardening

- ✅ Use strong `SECRET_KEY`
- ✅ Enable HTTPS (SSL/TLS)
- ✅ Set up firewall rules
- ✅ Regular security updates
- ✅ Use environment variables (never commit secrets)
- ✅ Set up rate limiting (consider using FastAPI's `slowapi`)

### 8. Performance Optimization

- ✅ Enable Next.js production mode
- ✅ Set up CDN for static assets
- ✅ Enable database connection pooling
- ✅ Configure caching headers in Nginx
- ✅ Consider using Redis for session management

---

## Troubleshooting

### Frontend can't connect to backend

- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify CORS settings in backend
- Check backend is accessible from frontend domain

### Database connection errors

- Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- Check firewall rules allow database connections
- Verify database user has correct permissions

### File upload issues

- Check directory permissions
- Verify `uploads` directory exists
- Check Nginx `client_max_body_size` setting

### Google OAuth not working

- Verify OAuth credentials in Google Console
- Check authorized origins/redirects match your domain
- Ensure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly

---

## Support

If you encounter issues:
1. Check application logs
2. Review error messages
3. Verify all environment variables are set
4. Test endpoints individually
5. Check database connectivity

Good luck with your deployment! 🚀

