"""
Custom middleware for the application
"""
import logging
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

logger = logging.getLogger(__name__)


def setup_cors_middleware(app):
    """
    Setup CORS middleware with configuration from settings
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=settings.allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if settings.is_development and settings.CORS_ALLOW_ALL:
        logger.warning("CORS: Allowing all origins in development mode (allow_credentials will be False)")
    else:
        logger.info(f"CORS: Allowing origins: {settings.allowed_origins}")


async def cors_debug_middleware(request: Request, call_next):
    """
    Debug middleware to log CORS requests
    """
    origin = request.headers.get("origin")
    if origin:
        logger.debug(f"CORS request from origin: {origin}")
    response = await call_next(request)
    return response
