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
    overall_band: Optional[Decimal]
    feedback: Optional[str]
    feedback_strengths: Optional[str]  # JSON string
    feedback_improvements: Optional[str]  # JSON string
    feedback_corrections: Optional[str]  # JSON string
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackHistoryItem(BaseModel):
    """Condensed feedback item for history list"""
    id: int
    question_id: Optional[int]
    part: int
    overall_band: Optional[Decimal]
    fluency_score: Optional[Decimal]
    vocabulary_score: Optional[Decimal]
    grammar_score: Optional[Decimal]
    pronunciation_score: Optional[Decimal]
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackDetailResponse(BaseModel):
    """Detailed feedback response for review"""
    id: int
    question_id: Optional[int]
    question_text: Optional[str]
    part: int
    transcription: Optional[str]
    audio_url: Optional[str]
    overall_band: Optional[Decimal]
    fluency_score: Optional[Decimal]
    vocabulary_score: Optional[Decimal]
    grammar_score: Optional[Decimal]
    pronunciation_score: Optional[Decimal]
    feedback: Optional[str]
    strengths: List[str]
    improvements: List[str]
    corrections: List[dict]
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


# Streak Analytics schemas
class CalendarDayResponse(BaseModel):
    date: date
    has_activity: bool
    practice_count: int


class YearlyHeatmapResponse(BaseModel):
    date: date
    practice_count: int


class StreakHistoryItem(BaseModel):
    start_date: date
    streak_length: int
    is_active: bool


class WeeklyPatternItem(BaseModel):
    day_of_week: int  # 0=Sunday, 6=Saturday
    day_name: str
    total_practice: int


class MonthlyProgressItem(BaseModel):
    month: str
    year: int
    total_practice: int


class TimeOfDayItem(BaseModel):
    period: str  # Morning, Afternoon, Evening, Night
    total_practice: int


class StreakAnalyticsResponse(BaseModel):
    current_streak: int
    off_days: int
    this_month: int
    total_completions: int
    calendar_days: List[CalendarDayResponse]
    yearly_heatmap: List[YearlyHeatmapResponse]
    streak_history: List[StreakHistoryItem]
    weekly_pattern: List[WeeklyPatternItem]
    monthly_progress: List[MonthlyProgressItem]
    time_of_day: List[TimeOfDayItem]


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class GoogleTokenRequest(BaseModel):
    token: str  # Google ID token

