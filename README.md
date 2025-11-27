<div align="center">
  <img src="assets/banner.jpeg" alt="IELTS Speaking Practice Platform Banner" width="100%"/>
</div>

<div align="center">
  <h1>🎤 IELTS Speaking Practice Platform</h1>
  <p>A comprehensive full-stack web application for IELTS speaking practice with AI-powered feedback</p>
  
  <div>
    <a href="https://github.com/chunporo/english_speaking_test/blob/master/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue" alt="license"/></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.104.1-009688?logo=fastapi&logoColor=white" alt="FastAPI"/></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14.0.4-black?logo=next.js&logoColor=white" alt="Next.js"/></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-15+-316192?logo=postgresql&logoColor=white" alt="PostgreSQL"/></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white" alt="TypeScript"/></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.3-38bdf8?logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/></a>
    <a href="https://openai.com/research/whisper"><img src="https://img.shields.io/badge/Whisper-AI_Transcription-10a37f?logo=openai&logoColor=white" alt="Whisper"/></a>
    <a href="https://developer.puter.com/tutorials/free-unlimited-text-to-speech-api/"><img src="https://img.shields.io/badge/TTS-Puter.js-green" alt="TTS"/></a>
  </div>
  
  <div>
    <a href="#features"><img src="https://img.shields.io/badge/features-8+-purple" alt="features"/></a>
    <a href="#quick-start"><img src="https://img.shields.io/badge/quick_start-5_min-orange" alt="quick-start"/></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/tech_stack-modern-blue" alt="tech-stack"/></a>
    <a href="https://github.com/chunporo/anna_speaking_test/issues"><img src="https://img.shields.io/github/issues/chunporo/anna_speaking_test" alt="issues"/></a>
    <a href="https://github.com/chunporo/anna_speaking_test/stargazers"><img src="https://img.shields.io/github/stars/chunporo/anna_speaking_test" alt="stars"/></a>
  </div>
</div>

---

## 📖 Overview

A full-stack web application for IELTS speaking practice, built with **FastAPI** (backend) and **Next.js** with **Tailwind CSS** (frontend). Features AI-powered speech transcription using Whisper and text-to-speech for question audio playback.

## ✨ Features

- 🏠 **Homepage Dashboard** - Progress tracking, streaks, and GitHub-style activity calendar
- 📝 **Practice by Question** - Practice questions from Part 1, 2, and 3 with instant feedback
- 🎯 **Mock Tests** - Take full or partial mock tests simulating real IELTS exam conditions
- 📊 **Progress Tracking** - Daily progress, streaks, and part-wise progress analytics
- 👤 **User Management** - Secure authentication with Google OAuth support
- 📈 **Activity Calendar** - Visual GitHub-style contribution graph showing practice history
- 🎤 **AI-Powered Transcription** - Automatic speech-to-text using Whisper AI
- 🔊 **Text-to-Speech** - Question audio playback using Puter.js TTS
- 📱 **Responsive Design** - Beautiful UI built with Tailwind CSS
- 🔄 **Real-time Updates** - Live progress tracking and streak management

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Development](#-development)
- [Google OAuth Setup](#-google-oauth-setup)
- [License](#-license)

## 📁 Project Structure

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

## 🚀 Quick Start

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
# GOOGLE_CLIENT_ID=your-google-client-id  # For Google OAuth
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
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id  # For Google OAuth
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Frontend will be available at http://localhost:3000

## 🗄️ Database Schema

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

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Login/Register with Google OAuth
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

## 🛠️ Tech Stack

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

## 💻 Development

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
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID (get from [Google Cloud Console](https://console.cloud.google.com/))

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID (same as backend)

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Configure OAuth consent screen
6. Create OAuth 2.0 Client ID for Web application
7. Add authorized JavaScript origins: `http://localhost:3000` (for development)
8. Add authorized redirect URIs: `http://localhost:3000` (for development)
9. Copy the Client ID and add it to both backend `.env` and frontend `.env.local` files

**Note:** For production, update the authorized origins and redirect URIs to your production domain.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with ❤️ for IELTS learners</p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>

