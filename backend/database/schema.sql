-- Database schema for IELTS Speaking Practice Platform

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    part INTEGER NOT NULL CHECK (part IN (1, 2, 3)),
    topic VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User questions (custom questions added by users)
CREATE TABLE user_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    part INTEGER NOT NULL CHECK (part IN (1, 2, 3)),
    topic VARCHAR(100),
    question_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Practice sessions (when user practices a question)
CREATE TABLE practice_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
    user_question_id INTEGER REFERENCES user_questions(id) ON DELETE SET NULL,
    part INTEGER NOT NULL CHECK (part IN (1, 2, 3)),
    audio_url TEXT,
    transcription TEXT,
    fluency_score DECIMAL(3, 2),
    vocabulary_score DECIMAL(3, 2),
    grammar_score DECIMAL(3, 2),
    pronunciation_score DECIMAL(3, 2),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mock tests
CREATE TABLE mock_tests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('PART1', 'PART2', 'PART3', 'FULL')),
    fluency_score DECIMAL(3, 2),
    vocabulary_score DECIMAL(3, 2),
    grammar_score DECIMAL(3, 2),
    pronunciation_score DECIMAL(3, 2),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mock test questions (questions used in a mock test)
CREATE TABLE mock_test_questions (
    id SERIAL PRIMARY KEY,
    mock_test_id INTEGER REFERENCES mock_tests(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
    user_question_id INTEGER REFERENCES user_questions(id) ON DELETE SET NULL,
    part INTEGER NOT NULL CHECK (part IN (1, 2, 3)),
    audio_url TEXT,
    transcription TEXT,
    order_index INTEGER NOT NULL
);

-- Daily progress tracking
CREATE TABLE daily_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    practice_count INTEGER DEFAULT 0,
    target_count INTEGER DEFAULT 25,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, date);

-- Streaks tracking
CREATE TABLE streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    frozen_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Activity calendar (for tracking practice activity)
CREATE TABLE activity_calendar (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    practice_count INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Part progress tracking
CREATE TABLE part_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    part INTEGER NOT NULL CHECK (part IN (1, 2, 3)),
    completed_count INTEGER DEFAULT 0,
    total_count INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, part)
);

-- Indexes for better query performance
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_created_at ON practice_sessions(created_at);
CREATE INDEX idx_mock_tests_user_id ON mock_tests(user_id);
CREATE INDEX idx_questions_part_topic ON questions(part, topic);
CREATE INDEX idx_activity_calendar_user_date ON activity_calendar(user_id, date);
CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, date);

