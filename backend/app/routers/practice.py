from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import os
import uuid
import shutil
import logging
import json
from pathlib import Path
from app.database import get_db
from app import models, schemas, auth
from app.services import whisper_service
from app.services.gemini_feedback_service import get_ielts_feedback, format_feedback_text, IELTSFeedback
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
    
    # Get IELTS examiner feedback using Gemini AI
    fluency_score = Decimal("5.0")
    vocabulary_score = Decimal("5.0")
    grammar_score = Decimal("5.0")
    pronunciation_score = Decimal("5.0")
    overall_band = Decimal("5.0")
    feedback = ""
    feedback_strengths = "[]"
    feedback_improvements = "[]"
    feedback_corrections = "[]"
    
    try:
        # Get IELTS feedback from Gemini
        ielts_feedback = await get_ielts_feedback(
            transcription=transcription,
            question=question.question_text,
            part=part
        )
        
        if ielts_feedback:
            fluency_score = ielts_feedback.fluency_score
            vocabulary_score = ielts_feedback.vocabulary_score
            grammar_score = ielts_feedback.grammar_score
            pronunciation_score = ielts_feedback.pronunciation_score
            overall_band = ielts_feedback.overall_band
            feedback = format_feedback_text(ielts_feedback)
            # Store structured feedback as JSON
            feedback_strengths = json.dumps(ielts_feedback.strengths, ensure_ascii=False)
            feedback_improvements = json.dumps(ielts_feedback.improvements, ensure_ascii=False)
            feedback_corrections = json.dumps(ielts_feedback.sample_corrections, ensure_ascii=False)
            logging.info(f"IELTS feedback generated - Overall band: {ielts_feedback.overall_band}")
        else:
            # Fallback if Gemini is unavailable
            feedback = """⚠️ **Dịch vụ AI không khả dụng**

Dịch vụ phản hồi AI hiện không khả dụng. Vui lòng đảm bảo:
1. Biến môi trường GEMINI_API_KEY đã được cấu hình
2. Package google-generativeai đã được cài đặt

Bản ghi của bạn đã được lưu. Bạn có thể thử lại sau để nhận phản hồi IELTS chi tiết."""
            logging.warning("Gemini feedback unavailable, using fallback")
            
    except Exception as e:
        logging.error(f"Error getting IELTS feedback: {str(e)}")
        feedback = f"""⚠️ **Lỗi tạo phản hồi**

Đã xảy ra lỗi khi tạo phản hồi: {str(e)}

Bản ghi của bạn đã được lưu. Vui lòng thử lại sau."""
    
    # Create practice session with structured feedback
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
        overall_band=overall_band,
        feedback=feedback,
        feedback_strengths=feedback_strengths,
        feedback_improvements=feedback_improvements,
        feedback_corrections=feedback_corrections
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


@router.get("/feedback/history", response_model=List[schemas.FeedbackHistoryItem])
def get_feedback_history(
    limit: int = 20,
    offset: int = 0,
    part: Optional[int] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy lịch sử phản hồi của người dùng
    
    Get user's feedback history with pagination and optional part filter
    """
    query = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id,
        models.PracticeSession.feedback.isnot(None),
        models.PracticeSession.audio_url.isnot(None)  # Only sessions with actual submissions
    )
    
    if part is not None:
        query = query.filter(models.PracticeSession.part == part)
    
    sessions = query.order_by(
        desc(models.PracticeSession.created_at)
    ).offset(offset).limit(limit).all()
    
    return sessions


@router.get("/feedback/{session_id}", response_model=schemas.FeedbackDetailResponse)
def get_feedback_detail(
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Xem chi tiết phản hồi của một phiên luyện tập
    
    Get detailed feedback for a specific practice session
    """
    session = db.query(models.PracticeSession).filter(
        models.PracticeSession.id == session_id,
        models.PracticeSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy phiên luyện tập"
        )
    
    # Get question text if available
    question_text = None
    if session.question_id:
        question = db.query(models.Question).filter(
            models.Question.id == session.question_id
        ).first()
        if question:
            question_text = question.question_text
    elif session.user_question_id:
        user_question = db.query(models.UserQuestion).filter(
            models.UserQuestion.id == session.user_question_id
        ).first()
        if user_question:
            question_text = user_question.question_text
    
    # Parse JSON fields
    strengths = []
    improvements = []
    corrections = []
    
    try:
        if session.feedback_strengths:
            strengths = json.loads(session.feedback_strengths)
    except json.JSONDecodeError:
        pass
    
    try:
        if session.feedback_improvements:
            improvements = json.loads(session.feedback_improvements)
    except json.JSONDecodeError:
        pass
    
    try:
        if session.feedback_corrections:
            corrections = json.loads(session.feedback_corrections)
    except json.JSONDecodeError:
        pass
    
    return schemas.FeedbackDetailResponse(
        id=session.id,
        question_id=session.question_id,
        question_text=question_text,
        part=session.part,
        transcription=session.transcription,
        audio_url=session.audio_url,
        overall_band=session.overall_band,
        fluency_score=session.fluency_score,
        vocabulary_score=session.vocabulary_score,
        grammar_score=session.grammar_score,
        pronunciation_score=session.pronunciation_score,
        feedback=session.feedback,
        strengths=strengths,
        improvements=improvements,
        corrections=corrections,
        created_at=session.created_at
    )


@router.get("/feedback/stats/summary")
def get_feedback_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Thống kê tổng quan về các phiên luyện tập
    
    Get summary statistics of user's practice sessions
    """
    # Get all sessions with feedback
    sessions = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id,
        models.PracticeSession.overall_band.isnot(None)
    ).all()
    
    if not sessions:
        return {
            "total_sessions": 0,
            "average_overall_band": None,
            "average_fluency": None,
            "average_vocabulary": None,
            "average_grammar": None,
            "average_pronunciation": None,
            "highest_band": None,
            "latest_band": None,
            "by_part": {}
        }
    
    # Calculate averages
    total = len(sessions)
    avg_overall = sum(float(s.overall_band or 0) for s in sessions) / total
    avg_fluency = sum(float(s.fluency_score or 0) for s in sessions) / total
    avg_vocabulary = sum(float(s.vocabulary_score or 0) for s in sessions) / total
    avg_grammar = sum(float(s.grammar_score or 0) for s in sessions) / total
    avg_pronunciation = sum(float(s.pronunciation_score or 0) for s in sessions) / total
    
    highest = max(float(s.overall_band or 0) for s in sessions)
    latest = float(sessions[0].overall_band or 0) if sessions else None
    
    # Stats by part
    by_part = {}
    for part in [1, 2, 3]:
        part_sessions = [s for s in sessions if s.part == part]
        if part_sessions:
            by_part[f"part_{part}"] = {
                "count": len(part_sessions),
                "average_band": round(sum(float(s.overall_band or 0) for s in part_sessions) / len(part_sessions), 1)
            }
    
    return {
        "total_sessions": total,
        "average_overall_band": round(avg_overall, 1),
        "average_fluency": round(avg_fluency, 1),
        "average_vocabulary": round(avg_vocabulary, 1),
        "average_grammar": round(avg_grammar, 1),
        "average_pronunciation": round(avg_pronunciation, 1),
        "highest_band": highest,
        "latest_band": latest,
        "by_part": by_part
    }

