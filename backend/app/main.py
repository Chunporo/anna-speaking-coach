from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, questions, practice, mock_test, progress, users
import os

app = FastAPI(title="IELTS Speaking Practice API", version="1.0.0")

# Mount static files for audio uploads
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(practice.router, prefix="/api/practice", tags=["practice"])
app.include_router(mock_test.router, prefix="/api/mock-test", tags=["mock-test"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])


@app.get("/")
async def root():
    return {"message": "IELTS Speaking Practice API"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}

