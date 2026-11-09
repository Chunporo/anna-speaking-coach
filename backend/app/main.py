import logging

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.middleware import cors_debug_middleware, setup_cors_middleware
from app.routers import (
    auth,
    feedback,
    mock_test,
    practice,
    progress,
    questions,
    transcription,
    users,
)
from app.services.tts_service import TTS_OUTPUT_DIR

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

# Mount static files for audio uploads
app.mount("/uploads/tts", StaticFiles(directory=str(TTS_OUTPUT_DIR)), name="tts")

# Setup CORS middleware
setup_cors_middleware(app)


# CORS debugging middleware (optional, for troubleshooting)
@app.middleware("http")
async def cors_debug(request: Request, call_next):
    return await cors_debug_middleware(request, call_next)


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(practice.router, prefix="/api/practice", tags=["practice"])
app.include_router(mock_test.router, prefix="/api/mock-test", tags=["mock-test"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(
    transcription.router, prefix="/api/transcription", tags=["transcription"]
)
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])


@app.get("/")
async def root():
    return {"message": "IELTS Speaking Practice API"}


@app.get("/api/health")
def health():
    from fastapi import HTTPException
    from sqlalchemy import text

    from app.database import SessionLocal

    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "healthy"}


@app.get("/api/cors-test")
async def cors_test(request: Request):
    """Test endpoint to verify CORS is working"""
    origin = request.headers.get("origin")
    return {
        "status": "CORS test successful",
        "origin": origin,
        "allowed_origins": settings.allowed_origins,
        "allow_credentials": settings.allow_credentials,
        "environment": settings.ENVIRONMENT,
    }
