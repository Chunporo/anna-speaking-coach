"""Speech-to-text transcription endpoints using Google Cloud or Whisper."""

import logging
import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer

from app import models
from app.services.google_speech_service import (
    GOOGLE_SPEECH_AVAILABLE,
    get_speech_client,
    transcribe_with_fallback,
)
from app.utils.rate_limit import ai_user
from app.utils.uploads import save_audio

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/audio")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

# Optional OAuth2 scheme for optional authentication
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="api/auth/login", auto_error=False
)


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    use_google: bool = True,
    language_code: str = "en-US",
    current_user: models.User = Depends(ai_user),
):
    """
    Transcribe audio file using Google Cloud Speech-to-Text (primary) or Whisper (fallback)

    Args:
        audio: Audio file to transcribe
        use_google: Whether to try Google Cloud Speech-to-Text first (default: True)
        language_code: BCP-47 language code (default: "en-US")
        token: Optional authentication token

    Returns:
        JSON response with transcription and method used
    """
    # Save audio file temporarily
    file_extension = os.path.splitext(audio.filename or "")[1] or ".webm"
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / filename

    try:
        # Save uploaded file
        import asyncio

        await asyncio.to_thread(save_audio, audio, file_path)

        transcription, method = await asyncio.to_thread(
            transcribe_with_fallback,
            file_path,
            language_code=language_code,
            use_google=use_google,
        )

        response_data = {
            "transcription": transcription,
            "method": method,
            "language_code": language_code,
            "method_display": "Google Cloud Speech-to-Text"
            if method == "google"
            else "Whisper (Local)",
        }

        # Log the method used for easy debugging
        logger.info(
            f"📝 Transcription completed using: {response_data['method_display']}"
        )

        return JSONResponse(response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temporary file
        try:
            if file_path.exists():
                os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to clean up temporary file: {e}")


@router.get("/transcribe/status")
async def get_transcription_status():
    """
    Get status of transcription services availability

    Returns:
        JSON response with service availability status
    """
    google_available = False
    google_error = None

    if GOOGLE_SPEECH_AVAILABLE:
        client = get_speech_client()
        if client:
            google_available = True
        else:
            google_error = "Google Cloud credentials not configured"
    else:
        google_error = "Google Cloud Speech library not installed"

    return JSONResponse(
        {
            "google_speech": {"available": google_available, "error": google_error},
            "whisper": {
                "available": bool(shutil.which("whisper") or shutil.which("mamba")),
                "error": None
                if (shutil.which("whisper") or shutil.which("mamba"))
                else "Local Whisper is not installed",
            },
        }
    )
