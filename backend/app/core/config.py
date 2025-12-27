"""
Application configuration module
Centralizes all configuration settings from environment variables
"""
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "IELTS Speaking Practice API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/ielts_speaking"
    )

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # CORS
    ALLOWED_ORIGINS_STR: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    CORS_ALLOW_ALL: bool = os.getenv("CORS_ALLOW_ALL", "true").lower() == "true"

    # File Uploads
    UPLOAD_DIR: Path = Path("uploads/audio")
    UPLOAD_BASE_URL: str = "/uploads/audio"

    # AI Services
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

    # Transcription
    DEFAULT_LANGUAGE_CODE: str = "en-US"
    DEFAULT_AUDIO_EXTENSION: str = ".webm"

    @property
    def allowed_origins(self) -> List[str]:
        """Get list of allowed CORS origins"""
        if self.ENVIRONMENT == "development" and self.CORS_ALLOW_ALL:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",") if origin.strip()]

    @property
    def allow_credentials(self) -> bool:
        """Determine if credentials should be allowed based on environment"""
        if self.ENVIRONMENT == "development" and self.CORS_ALLOW_ALL:
            return False
        return True

    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT == "production"


# Global settings instance
settings = Settings()
