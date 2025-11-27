from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import os
import uuid
import shutil
import random
import logging
from pathlib import Path
from app.database import get_db
from app import models, schemas, auth
from app.services import whisper_service
from decimal import Decimal

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/audio")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/", response_model=schemas.PracticeSessionResponse)
def create_practice_session(
    session: schemas.PracticeSessionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_session = models.PracticeSession(
        user_id=current_user.id,
        **session.model_dump()
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Update daily progress
    today = date.today()
    daily_progress = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == current_user.id,
        models.DailyProgress.date == today
    ).first()
    
    if not daily_progress:
        daily_progress = models.DailyProgress(
            user_id=current_user.id,
            date=today,
            practice_count=1
        )
        db.add(daily_progress)
    else:
        daily_progress.practice_count += 1
    
    # Update activity calendar
    activity = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.date == today
    ).first()
    
    if not activity:
        activity = models.ActivityCalendar(
            user_id=current_user.id,
            date=today,
            practice_count=1
        )
        db.add(activity)
    else:
        activity.practice_count += 1
    
    # Update part progress
    part_progress = db.query(models.PartProgress).filter(
        models.PartProgress.user_id == current_user.id,
        models.PartProgress.part == session.part
    ).first()
    
    if part_progress:
        part_progress.completed_count += 1
    else:
        # Get total count for this part
        total_count = db.query(func.count(models.Question.id)).filter(
            models.Question.part == session.part
        ).scalar() or 0
        part_progress = models.PartProgress(
            user_id=current_user.id,
            part=session.part,
            completed_count=1,
            total_count=total_count
        )
        db.add(part_progress)
    
    # Update streak
    streak = db.query(models.Streak).filter(
        models.Streak.user_id == current_user.id
    ).first()
    
    if streak:
        if streak.last_activity_date:
            days_diff = (today - streak.last_activity_date).days
            if days_diff == 1:
                streak.current_streak += 1
            elif days_diff > 1:
                streak.current_streak = 1
            # If days_diff == 0, same day, don't increment
        else:
            streak.current_streak = 1
        
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
        
        streak.last_activity_date = today
    else:
        streak = models.Streak(
            user_id=current_user.id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today
        )
        db.add(streak)
    
    db.commit()
    return db_session


@router.get("/", response_model=List[schemas.PracticeSessionResponse])
def get_practice_sessions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id
    ).order_by(models.PracticeSession.created_at.desc()).all()


@router.get("/question/{question_id}")
def get_practice_history_by_question(
    question_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get practice history for a specific question - only returns sessions with audio (submitted for analysis)"""
    sessions = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id,
        models.PracticeSession.question_id == question_id,
        models.PracticeSession.audio_url.isnot(None)  # Only count sessions with audio (submitted for analysis)
    ).order_by(desc(models.PracticeSession.created_at)).all()
    
    return {
        "sessions": sessions,
        "total_practices": len(sessions)
    }


@router.post("/analyze")
async def analyze_audio(
    audio: UploadFile = File(...),
    question_id: int = Form(...),
    part: int = Form(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze audio recording and create practice session with scores"""
    
    # Verify question exists
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Save audio file
    file_extension = os.path.splitext(audio.filename)[1] or ".webm"
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    
    audio_url = f"/uploads/audio/{filename}"
    
    # Transcribe audio using Google Cloud Speech-to-Text with Whisper fallback
    from app.services.google_speech_service import transcribe_with_fallback
    transcription = ""
    transcription_method = "unknown"
    try:
        transcription, transcription_method = transcribe_with_fallback(
            file_path,
            language_code="en-US",
            use_google=True  # Try Google first, fallback to Whisper
        )
        # Add method info to transcription for display
        method_display = "Google Cloud Speech-to-Text" if transcription_method == "google" else "Whisper (Local)"
        logging.info(f"Transcription completed using: {method_display}")
    except Exception as e:
        # Log error but continue - we'll use placeholder
        logging.error(f"Transcription error: {str(e)}")
        transcription = f"[Transcription error: {str(e)}. Please check that 'mamba activate whisper' works and Whisper is installed.]"
        transcription_method = "error"
    
    # Simulate scores (in production, these would come from AI analysis)
    fluency_score = Decimal(str(round(random.uniform(5.5, 7.5), 2)))
    vocabulary_score = Decimal(str(round(random.uniform(5.5, 7.5), 2)))
    grammar_score = Decimal(str(round(random.uniform(5.5, 7.5), 2)))
    pronunciation_score = Decimal(str(round(random.uniform(5.5, 7.5), 2)))
    
    feedback = """This is placeholder feedback. In production, AI would analyze:
- Grammar mistakes and corrections
- Vocabulary suggestions
- Pronunciation tips
- Fluency improvements
- Overall recommendations"""
    
    # Create practice session
    db_session = models.PracticeSession(
        user_id=current_user.id,
        question_id=question_id,
        part=part,
        audio_url=audio_url,
        transcription=transcription,
        fluency_score=fluency_score,
        vocabulary_score=vocabulary_score,
        grammar_score=grammar_score,
        pronunciation_score=pronunciation_score,
        feedback=feedback
    )
    db.add(db_session)
    
    # Update progress (reuse existing logic)
    today = date.today()
    daily_progress = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == current_user.id,
        models.DailyProgress.date == today
    ).first()
    
    if not daily_progress:
        daily_progress = models.DailyProgress(
            user_id=current_user.id,
            date=today,
            practice_count=1
        )
        db.add(daily_progress)
    else:
        daily_progress.practice_count += 1
    
    activity = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.date == today
    ).first()
    
    if not activity:
        activity = models.ActivityCalendar(
            user_id=current_user.id,
            date=today,
            practice_count=1
        )
        db.add(activity)
    else:
        activity.practice_count += 1
    
    part_progress = db.query(models.PartProgress).filter(
        models.PartProgress.user_id == current_user.id,
        models.PartProgress.part == part
    ).first()
    
    if part_progress:
        part_progress.completed_count += 1
    else:
        total_count = db.query(func.count(models.Question.id)).filter(
            models.Question.part == part
        ).scalar() or 0
        part_progress = models.PartProgress(
            user_id=current_user.id,
            part=part,
            completed_count=1,
            total_count=total_count
        )
        db.add(part_progress)
    
    streak = db.query(models.Streak).filter(
        models.Streak.user_id == current_user.id
    ).first()
    
    if streak:
        if streak.last_activity_date:
            days_diff = (today - streak.last_activity_date).days
            if days_diff == 1:
                streak.current_streak += 1
            elif days_diff > 1:
                streak.current_streak = 1
        else:
            streak.current_streak = 1
        
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
        
        streak.last_activity_date = today
    else:
        streak = models.Streak(
            user_id=current_user.id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today
        )
        db.add(streak)
    
    db.commit()
    db.refresh(db_session)
    
    return db_session

