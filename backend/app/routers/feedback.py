"""
Feedback router - handles IELTS feedback generation endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import logging

from app.services.gemini_feedback_service import (
    get_ielts_feedback,
    format_feedback_text,
    GEMINI_AVAILABLE,
    get_gemini_client
)
from app import models, auth

router = APIRouter()
logger = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    """Request model for feedback generation"""
    transcription: str
    question: str
    part: int = 1


class FeedbackResponse(BaseModel):
    """Response model for feedback"""
    fluency_score: float
    vocabulary_score: float
    grammar_score: float
    pronunciation_score: float
    overall_band: float
    feedback: str
    strengths: list
    improvements: list
    sample_corrections: list


@router.get("/status")
async def get_feedback_status():
    """
    Check if the Gemini feedback service is available and configured
    
    Returns:
        JSON response with service availability status
    """
    gemini_available = False
    gemini_error = None
    
    if not GEMINI_AVAILABLE:
        gemini_error = "google-generativeai package not installed"
    else:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            gemini_error = "GEMINI_API_KEY environment variable not set"
        else:
            client = get_gemini_client()
            if client:
                gemini_available = True
            else:
                gemini_error = "Failed to initialize Gemini client"
    
    return JSONResponse({
        "gemini_feedback": {
            "available": gemini_available,
            "error": gemini_error
        },
        "model": "gemini-2.5-flash" if gemini_available else None
    })


@router.post("/analyze", response_model=FeedbackResponse)
async def analyze_transcription(
    request: FeedbackRequest,
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Analyze a transcription and get IELTS examiner feedback
    
    This endpoint can be used to get feedback for any transcription,
    independent of the practice session flow.
    
    Args:
        request: FeedbackRequest with transcription, question, and part
        current_user: Authenticated user
        
    Returns:
        FeedbackResponse with IELTS scores and detailed feedback
    """
    if not request.transcription or len(request.transcription.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Transcription is too short. Please provide a longer response."
        )
    
    if request.part not in [1, 2, 3]:
        raise HTTPException(
            status_code=400,
            detail="Part must be 1, 2, or 3"
        )
    
    try:
        ielts_feedback = await get_ielts_feedback(
            transcription=request.transcription,
            question=request.question,
            part=request.part
        )
        
        if not ielts_feedback:
            raise HTTPException(
                status_code=503,
                detail="Feedback service is unavailable. Please check GEMINI_API_KEY configuration."
            )
        
        return FeedbackResponse(
            fluency_score=float(ielts_feedback.fluency_score),
            vocabulary_score=float(ielts_feedback.vocabulary_score),
            grammar_score=float(ielts_feedback.grammar_score),
            pronunciation_score=float(ielts_feedback.pronunciation_score),
            overall_band=float(ielts_feedback.overall_band),
            feedback=format_feedback_text(ielts_feedback),
            strengths=ielts_feedback.strengths,
            improvements=ielts_feedback.improvements,
            sample_corrections=ielts_feedback.sample_corrections
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing transcription: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate feedback: {str(e)}"
        )

