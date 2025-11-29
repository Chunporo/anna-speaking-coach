from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, questions, practice, mock_test, progress, users, transcription, feedback
import os
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="IELTS Speaking Practice API", version="1.0.0")

# Mount static files for audio uploads
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS configuration
# Get allowed origins from environment variable or use defaults
ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",") if origin.strip()]

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# In development, we can be more permissive
# Note: FastAPI CORS with allow_origins=["*"] works but requires allow_credentials=False
# For cloud IDEs, we'll use a custom approach
if ENVIRONMENT == "development":
    # In development, allow all origins (set allow_origins to ["*"])
    # But this requires allow_credentials=False
    CORS_ALLOW_ALL = os.getenv("CORS_ALLOW_ALL", "true").lower() == "true"
    if CORS_ALLOW_ALL:
        logger.warning("CORS: Allowing all origins in development mode (allow_credentials will be False)")
        ALLOWED_ORIGINS = ["*"]
        ALLOW_CREDENTIALS = False
    else:
        ALLOW_CREDENTIALS = True
        logger.info(f"CORS: Allowing specific origins: {ALLOWED_ORIGINS}")
else:
    ALLOW_CREDENTIALS = True
    logger.info(f"CORS: Production mode - Allowing origins: {ALLOWED_ORIGINS}")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS debugging middleware (optional, for troubleshooting)
@app.middleware("http")
async def cors_debug_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin:
        logger.debug(f"CORS request from origin: {origin}")
    response = await call_next(request)
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(practice.router, prefix="/api/practice", tags=["practice"])
app.include_router(mock_test.router, prefix="/api/mock-test", tags=["mock-test"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(transcription.router, prefix="/api/transcription", tags=["transcription"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])


@app.get("/")
async def root():
    return {"message": "IELTS Speaking Practice API"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/cors-test")
async def cors_test(request: Request):
    """Test endpoint to verify CORS is working"""
    origin = request.headers.get("origin")
    return {
        "status": "CORS test successful",
        "origin": origin,
        "allowed_origins": ALLOWED_ORIGINS,
        "allow_credentials": ALLOW_CREDENTIALS,
        "environment": ENVIRONMENT
    }

