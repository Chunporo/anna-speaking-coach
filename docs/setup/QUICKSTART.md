# Quick Start Guide

Follow these steps to get your IELTS Speaking Practice platform running:

## Step 1: Set Up Database

### Option A: Using PostgreSQL (Recommended)

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   ```

2. **Create the database**:
   ```bash
   # Start PostgreSQL service
   sudo systemctl start postgresql  # Linux
   # or
   brew services start postgresql  # macOS
   
   # Create database
   createdb ielts_speaking
   # Or if you need to specify user:
   # createdb -U postgres ielts_speaking
   ```

3. **Run the schema**:
   ```bash
   cd backend
   psql ielts_speaking < database/schema.sql
   psql ielts_speaking < database/seed_data.sql
   ```

### Option B: Using SQLite (For Quick Testing)

If you don't have PostgreSQL, you can modify the database connection to use SQLite temporarily. However, PostgreSQL is recommended for production.

## Step 2: Configure Backend

1. **Create `.env` file**:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env`** with your database credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/ielts_speaking
   SECRET_KEY=your-secret-key-change-this-in-production
   ```
   
   For PostgreSQL default setup:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ielts_speaking
   SECRET_KEY=dev-secret-key-change-in-production
   ```

3. **Install dependencies** (if not already done):
   ```bash
   cd backend
   source .venv/bin/activate  # or: .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

## Step 3: Start Backend Server

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

✅ Backend API will be available at: http://localhost:8000
✅ API Documentation at: http://localhost:8000/docs

## Step 4: Configure Frontend

1. **Create `.env.local` file**:
   ```bash
   cd frontend
   echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
   ```

2. **Install dependencies** (if not already done):
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   ```

## Step 5: Start Frontend Server

Open a **new terminal window** and run:

```bash
cd frontend
npm run dev
# or
yarn dev
```

You should see:
```
✓ Ready in X seconds
○ Local:        http://localhost:3000
```

✅ Frontend will be available at: http://localhost:3000

## Step 6: Test the Application

1. **Open your browser** and go to: http://localhost:3000

2. **Register a new account**:
   - Click "Đăng ký" (Register)
   - Enter username, email, and password
   - Click "Đăng ký"

3. **Explore the features**:
   - Homepage with progress tracking
   - Practice by question (Part 1, 2, 3)
   - Mock tests
   - Progress tracking

## Troubleshooting

### Database Connection Error

If you get a database connection error:
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify database exists: `psql -l | grep ielts_speaking`
- Check your `.env` file has correct `DATABASE_URL`

### Port Already in Use

If port 8000 or 3000 is already in use:
- Backend: Change port in uvicorn command: `--port 8001`
- Frontend: Update `.env.local` to match: `NEXT_PUBLIC_API_URL=http://localhost:8001`

### Module Not Found Errors

Make sure you've activated the virtual environment:
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend Can't Connect to Backend

- Make sure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check CORS settings in `backend/app/main.py`

## Next Steps

Once everything is running:

1. **Add more questions** to the database
2. **Customize the UI** to match your preferences
3. **Add audio recording functionality** for practice sessions
4. **Implement scoring/feedback** using AI (Whisper, etc.)
5. **Deploy** to a production server

## Useful Commands

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm run dev

# Database (PostgreSQL)
psql ielts_speaking  # Connect to database
\dt                  # List tables
\d users             # Describe users table
```

