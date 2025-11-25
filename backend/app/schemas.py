from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72, description="Password must be between 6 and 72 characters")


class UserResponse(UserBase):
    id: int
    is_premium: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Question schemas
class QuestionBase(BaseModel):
    part: int
    topic: str
    question_text: str


class QuestionCreate(QuestionBase):
    pass


class QuestionResponse(QuestionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserQuestionCreate(BaseModel):
    part: int
    topic: Optional[str] = None
    question_text: str


class UserQuestionResponse(UserQuestionCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Practice session schemas
class PracticeSessionCreate(BaseModel):
    question_id: Optional[int] = None
    user_question_id: Optional[int] = None
    part: int
    audio_url: Optional[str] = None
    transcription: Optional[str] = None


class PracticeSessionResponse(BaseModel):
    id: int
    user_id: int
    question_id: Optional[int]
    user_question_id: Optional[int]
    part: int
    audio_url: Optional[str]
    transcription: Optional[str]
    fluency_score: Optional[Decimal]
    vocabulary_score: Optional[Decimal]
    grammar_score: Optional[Decimal]
    pronunciation_score: Optional[Decimal]
    feedback: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Mock test schemas
class MockTestCreate(BaseModel):
    test_type: str  # 'PART1', 'PART2', 'PART3', 'FULL'


class MockTestResponse(BaseModel):
    id: int
    user_id: int
    test_type: str
    fluency_score: Optional[Decimal]
    vocabulary_score: Optional[Decimal]
    grammar_score: Optional[Decimal]
    pronunciation_score: Optional[Decimal]
    feedback: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Progress schemas
class DailyProgressResponse(BaseModel):
    date: date
    practice_count: int
    target_count: int

    class Config:
        from_attributes = True


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    frozen_streak: int
    last_activity_date: Optional[date]

    class Config:
        from_attributes = True


class ActivityCalendarResponse(BaseModel):
    date: date
    practice_count: int

    class Config:
        from_attributes = True


class PartProgressResponse(BaseModel):
    part: int
    completed_count: int
    total_count: int

    class Config:
        from_attributes = True


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None

