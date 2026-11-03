"""Atomic, database-backed AI burst limits shared by all API workers."""
from fastapi import Depends, HTTPException
from sqlalchemy import text
from app import auth, models
from app.database import engine

LIMIT = 10


def enforce_ai_limit(user_id: int) -> None:
    # An independent transaction retains the attempt even if the request later fails.
    # The conditional upsert serializes concurrent workers on the user's single row.
    with engine.begin() as connection:
        accepted = connection.execute(text('''
            INSERT INTO ai_request_limits (user_id, window_started, request_count)
            VALUES (:user_id, CURRENT_TIMESTAMP, 1)
            ON CONFLICT (user_id) DO UPDATE SET
                window_started = CASE
                    WHEN ai_request_limits.window_started <= CURRENT_TIMESTAMP - INTERVAL '60 seconds'
                    THEN CURRENT_TIMESTAMP ELSE ai_request_limits.window_started END,
                request_count = CASE
                    WHEN ai_request_limits.window_started <= CURRENT_TIMESTAMP - INTERVAL '60 seconds'
                    THEN 1 ELSE ai_request_limits.request_count + 1 END
            WHERE ai_request_limits.request_count < :limit
               OR ai_request_limits.window_started <= CURRENT_TIMESTAMP - INTERVAL '60 seconds'
            RETURNING user_id
        '''), {'user_id': user_id, 'limit': LIMIT}).first()
    if accepted is None:
        raise HTTPException(
            status_code=429,
            detail='Please wait before submitting more audio or feedback',
            headers={'Retry-After': '60'},
        )


def ai_user(current_user: models.User = Depends(auth.get_current_user)):
    enforce_ai_limit(current_user.id)
    return current_user
