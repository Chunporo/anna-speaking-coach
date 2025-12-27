from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
import os
import uuid
import shutil
import logging
import json
from pathlib import Path
from decimal import Decimal
from app.database import get_db
from app import models, schemas, auth
from app.services.gemini_feedback_service import get_ielts_feedback, format_feedback_text
from app.core.config import settings
from app.core.constants import (
    DEFAULT_FLUENCY_SCORE,
    DEFAULT_VOCABULARY_SCORE,
    DEFAULT_GRAMMAR_SCORE,
    DEFAULT_PRONUNCIATION_SCORE,
    DEFAULT_OVERALL_BAND,
    TRANSCRIPTION_METHOD_GOOGLE,
    TRANSCRIPTION_METHOD_WHISPER,
    TRANSCRIPTION_METHOD_ERROR,
    TRANSCRIPTION_METHOD_UNKNOWN,
    TRANSCRIPTION_DISPLAY_GOOGLE,
    TRANSCRIPTION_DISPLAY_WHISPER,
    ERROR_QUESTION_NOT_FOUND,
    ERROR_SESSION_NOT_FOUND,
    ERROR_TRANSCRIPTION_FAILED,
    FEEDBACK_UNAVAILABLE,
    FEEDBACK_ERROR_TEMPLATE
)
from app.utils.progress import update_all_progress

router = APIRouter()

# Create uploads directory if it doesn't exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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

    # Update all progress metrics
    update_all_progress(db, current_user.id, session.part)
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
        raise HTTPException(status_code=404, detail=ERROR_QUESTION_NOT_FOUND)

    # Save audio file
    file_extension = os.path.splitext(audio.filename)[1] or settings.DEFAULT_AUDIO_EXTENSION
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = settings.UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    audio_url = f"{settings.UPLOAD_BASE_URL}/{filename}"

    # Transcribe audio using Google Cloud Speech-to-Text with Whisper fallback
    from app.services.google_speech_service import transcribe_with_fallback
    transcription = ""
    transcription_method = TRANSCRIPTION_METHOD_UNKNOWN
    try:
        transcription, transcription_method = transcribe_with_fallback(
            file_path,
            language_code=settings.DEFAULT_LANGUAGE_CODE,
            use_google=True  # Try Google first, fallback to Whisper
        )
        # Add method info to transcription for display
        method_display = TRANSCRIPTION_DISPLAY_GOOGLE if transcription_method == TRANSCRIPTION_METHOD_GOOGLE else TRANSCRIPTION_DISPLAY_WHISPER
        logging.info(f"Transcription completed using: {method_display}")
    except Exception as e:
        # Log error but continue - we'll use placeholder
        logging.error(f"Transcription error: {str(e)}")
        transcription = ERROR_TRANSCRIPTION_FAILED.format(error=str(e))
        transcription_method = TRANSCRIPTION_METHOD_ERROR

    # Get IELTS examiner feedback using Gemini AI
    fluency_score = DEFAULT_FLUENCY_SCORE
    vocabulary_score = DEFAULT_VOCABULARY_SCORE
    grammar_score = DEFAULT_GRAMMAR_SCORE
    pronunciation_score = DEFAULT_PRONUNCIATION_SCORE
    overall_band = DEFAULT_OVERALL_BAND
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
            feedback = FEEDBACK_UNAVAILABLE
            logging.warning("Gemini feedback unavailable, using fallback")

    except Exception as e:
        logging.error(f"Error getting IELTS feedback: {str(e)}")
        feedback = FEEDBACK_ERROR_TEMPLATE.format(error=str(e))

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

    # Update all progress metrics
    update_all_progress(db, current_user.id, part)

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
            detail=ERROR_SESSION_NOT_FOUND
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
