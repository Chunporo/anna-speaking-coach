# Environment Variables Setup Guide

This guide explains what environment variables you need to set up for the IELTS Speaking Coach application.

## Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

### Required Variables

```env
# Database Configuration
# Format: postgresql://username:password@host:port/database_name
# For local development with default PostgreSQL:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ielts_speaking

# Security
# Generate a secure secret key with: openssl rand -hex 32
SECRET_KEY=your-secret-key-change-this-in-production

# Google OAuth Configuration
# Get these from Google Cloud Console: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Environment
# Options: development, production
ENVIRONMENT=development

# CORS Configuration
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:3000

# CORS Allow All (Development Only)
# Set to "true" to allow all origins in development
CORS_ALLOW_ALL=true
```

### Optional Variables

```env
# Gemini API for AI Feedback
# Get your API key from: https://makersuite.google.com/app/apikey
# If not set, feedback features will be unavailable
GEMINI_API_KEY=your-gemini-api-key-here

# Google Cloud Speech-to-Text
# Path to your Google Cloud service account credentials JSON file
# If not set, the app will fall back to Whisper for transcription
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/google-credentials.json
```

## Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory with the following variables:

```env
# Backend API URL
# For local development:
NEXT_PUBLIC_API_URL=http://localhost:8000
# For production, use your deployed backend URL:
# NEXT_PUBLIC_API_URL=https://your-backend-url.com

# Google OAuth Client ID
# This should be the same as GOOGLE_CLIENT_ID in backend/.env
# If not set, Google Sign-In button will be hidden
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
```

## Quick Setup Steps

### 1. Backend Setup

```bash
cd backend
# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ielts_speaking
SECRET_KEY=$(openssl rand -hex 32)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000
CORS_ALLOW_ALL=true
EOF
```

### 2. Frontend Setup

```bash
cd frontend
# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
EOF
```

## Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API (or Google Identity API)
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Configure OAuth consent screen (if not already done)
7. Select **Web application** as the application type
8. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://your-production-domain.com` (for production)
9. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://your-production-domain.com` (for production)
10. Copy the **Client ID** and **Client Secret**

## Getting Gemini API Key (Optional)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the API key and add it to your backend `.env` file

## Getting Google Cloud Speech-to-Text Credentials (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Cloud Speech-to-Text API**
3. Go to **IAM & Admin** → **Service Accounts**
4. Create a new service account or use an existing one
5. Grant the **Cloud Speech-to-Text API User** role
6. Create a JSON key for the service account
7. Download the JSON file
8. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of this file

## Security Notes

- **Never commit `.env` or `.env.local` files to version control**
- Use strong, randomly generated `SECRET_KEY` values in production
- Rotate API keys and secrets regularly
- Use different credentials for development and production
- Keep your Google Cloud credentials file secure and never share it

## Default Values

If environment variables are not set, the application will use these defaults:

- `DATABASE_URL`: `postgresql://user:password@localhost:5432/ielts_speaking`
- `SECRET_KEY`: `your-secret-key-change-in-production` (⚠️ **Change this!**)
- `ENVIRONMENT`: `development`
- `ALLOWED_ORIGINS`: `http://localhost:3000`
- `CORS_ALLOW_ALL`: `true` (in development mode)
- `NEXT_PUBLIC_API_URL`: `http://localhost:8000` (fallback in code)

## Troubleshooting

### Backend can't connect to database

- Check that PostgreSQL is running: `sudo systemctl status postgresql`
- Verify `DATABASE_URL` format is correct
- Ensure the database exists: `psql -l | grep ielts_speaking`

### Google OAuth not working

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Check that authorized origins and redirect URIs are configured in Google Cloud Console
- Ensure the same `GOOGLE_CLIENT_ID` is used in both backend and frontend

### CORS errors

- Check `ALLOWED_ORIGINS` includes your frontend URL
- In development, you can set `CORS_ALLOW_ALL=true`
- Verify `ENVIRONMENT` is set correctly

### Gemini feedback not working

- Check that `GEMINI_API_KEY` is set
- Verify the API key is valid and has proper permissions
- Check backend logs for error messages
