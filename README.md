# IELTS Speaking Practice Platform

A full-stack web application for IELTS speaking practice, built with FastAPI (backend) and Next.js with Tailwind CSS (frontend).

## Features

- 🏠 **Homepage** with progress tracking, streaks, and activity calendar
- 📝 **Practice by Question** - Practice questions from Part 1, 2, and 3
- 🎯 **Mock Tests** - Take full or partial mock tests
- 📊 **Progress Tracking** - Daily progress, streaks, and part-wise progress
- 👤 **User Management** - Authentication and user accounts
- 📈 **Activity Calendar** - Visual representation of practice activity

## Project Structure

```
english_speaking_test/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── routers/  # API routes
│   │   ├── models.py # Database models
│   │   ├── schemas.py # Pydantic schemas
│   │   └── main.py   # FastAPI app
│   ├── database/
│   │   └── schema.sql # Database schema
│   └── requirements.txt
├── frontend/         # Next.js frontend
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── lib/          # Utilities and API client
│   └── package.json
└── README.md
```

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb ielts_speaking

# Run schema
psql ielts_speaking < database/schema.sql
```

4. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your database credentials:
# DATABASE_URL=postgresql://user:password@localhost:5432/ielts_speaking
# SECRET_KEY=your-secret-key-change-in-production
```

5. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

Backend will be available at http://localhost:8000
API docs at http://localhost:8000/docs

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Frontend will be available at http://localhost:3000

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts
- `questions` - Practice questions
- `user_questions` - Custom questions added by users
- `practice_sessions` - Practice session records
- `mock_tests` - Mock test records
- `daily_progress` - Daily practice progress
- `streaks` - User streak tracking
- `activity_calendar` - Activity calendar data
- `part_progress` - Progress by IELTS part (1, 2, 3)

See `backend/database/schema.sql` for the complete schema.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Questions
- `GET /api/questions/` - Get questions (with optional part and topic filters)
- `GET /api/questions/topics` - Get all topics
- `GET /api/questions/user-questions` - Get user's custom questions
- `POST /api/questions/user-questions` - Create custom question
- `DELETE /api/questions/user-questions/{id}` - Delete custom question

### Practice
- `POST /api/practice/` - Create practice session
- `GET /api/practice/` - Get practice sessions

### Mock Tests
- `POST /api/mock-test/` - Create mock test
- `GET /api/mock-test/` - Get mock tests
- `GET /api/mock-test/{id}` - Get specific mock test

### Progress
- `GET /api/progress/daily` - Get daily progress
- `GET /api/progress/streak` - Get streak info
- `GET /api/progress/activity-calendar` - Get activity calendar
- `GET /api/progress/part-progress` - Get part-wise progress

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM
- **PostgreSQL** - Database
- **Pydantic** - Data validation
- **JWT** - Authentication

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Zustand** - State management

## Development

### Adding Questions

You can add questions to the database by inserting into the `questions` table:

```sql
INSERT INTO questions (part, topic, question_text) VALUES
(1, 'Doing something well', 'Do you have an experience when you did something well?'),
(1, 'Rules', 'Are there any rules for students at your school?');
```

### Environment Variables

**Backend (.env):**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Secret key for JWT tokens

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL` - Backend API URL

## License

MIT

