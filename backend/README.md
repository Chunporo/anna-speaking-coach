# IELTS Speaking Practice - Backend API

FastAPI backend for the IELTS Speaking Practice platform.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up PostgreSQL database:
```bash
# Create database
createdb ielts_speaking

# Run schema
psql ielts_speaking < database/schema.sql
```

3. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```uvicorn app.main:app --reload --port 8000
ttp://localhost:8000/redoc

## Endpoints

- `/api/auth/register` - Register new user
- `/api/auth/login` - Login
- `/api/auth/me` - Get current user
- `/api/questions/` - Get questions
- `/api/questions/user-questions` - Get/create user questions
- `/api/practice/` - Create/get practice sessions
- `/api/mock-test/` - Create/get mock tests
- `/api/progress/daily` - Get daily progress
- `/api/progress/streak` - Get streak info
- `/api/progress/part-progress` - Get part progress
