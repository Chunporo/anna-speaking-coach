from sqlalchemy import Column, Integer, String, Boolean, Text, DECIMAL, Date, ForeignKey, TIMESTAMP, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Optional for OAuth users
    google_id = Column(String(255), unique=True, index=True, nullable=True)  # Google OAuth ID
    is_premium = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    part = Column(Integer, nullable=False)
    topic = Column(String(100), nullable=False)
    question_text = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        CheckConstraint('part IN (1, 2, 3)', name='check_part'),
    )


class UserQuestion(Base):
    __tablename__ = "user_questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    part = Column(Integer, nullable=False)
    topic = Column(String(100))
    question_text = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        CheckConstraint('part IN (1, 2, 3)', name='check_user_question_part'),
    )


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)
    user_question_id = Column(Integer, ForeignKey("user_questions.id", ondelete="SET NULL"), nullable=True)
    part = Column(Integer, nullable=False)
    audio_url = Column(Text)
    transcription = Column(Text)
    fluency_score = Column(DECIMAL(3, 2))
    vocabulary_score = Column(DECIMAL(3, 2))
    grammar_score = Column(DECIMAL(3, 2))
    pronunciation_score = Column(DECIMAL(3, 2))
    feedback = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    __table_args__ = (
        CheckConstraint('part IN (1, 2, 3)', name='check_practice_part'),
    )


class MockTest(Base):
    __tablename__ = "mock_tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    test_type = Column(String(20), nullable=False)
    fluency_score = Column(DECIMAL(3, 2))
    vocabulary_score = Column(DECIMAL(3, 2))
    grammar_score = Column(DECIMAL(3, 2))
    pronunciation_score = Column(DECIMAL(3, 2))
    feedback = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        CheckConstraint("test_type IN ('PART1', 'PART2', 'PART3', 'FULL')", name='check_test_type'),
    )


class MockTestQuestion(Base):
    __tablename__ = "mock_test_questions"

    id = Column(Integer, primary_key=True, index=True)
    mock_test_id = Column(Integer, ForeignKey("mock_tests.id", ondelete="CASCADE"))
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)
    user_question_id = Column(Integer, ForeignKey("user_questions.id", ondelete="SET NULL"), nullable=True)
    part = Column(Integer, nullable=False)
    audio_url = Column(Text)
    transcription = Column(Text)
    order_index = Column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint('part IN (1, 2, 3)', name='check_mock_test_question_part'),
    )


class DailyProgress(Base):
    __tablename__ = "daily_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date = Column(Date, nullable=False, index=True)
    practice_count = Column(Integer, default=0)
    target_count = Column(Integer, default=25)

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class Streak(Base):
    __tablename__ = "streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    frozen_streak = Column(Integer, default=0)
    last_activity_date = Column(Date)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class ActivityCalendar(Base):
    __tablename__ = "activity_calendar"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date = Column(Date, nullable=False, index=True)
    practice_count = Column(Integer, default=0)

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class PartProgress(Base):
    __tablename__ = "part_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    part = Column(Integer, nullable=False)
    completed_count = Column(Integer, default=0)
    total_count = Column(Integer, nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint('part IN (1, 2, 3)', name='check_part_progress_part'),
        {'sqlite_autoincrement': True},
    )

