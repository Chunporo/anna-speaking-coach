"""Deny direct Supabase Data API access to backend-owned application tables."""
from alembic import op

revision = '0004'
down_revision = '0003'

TABLES = (
    'users', 'questions', 'user_questions', 'practice_sessions', 'mock_tests',
    'mock_test_questions', 'daily_progress', 'streaks', 'activity_calendar',
    'part_progress', 'ai_request_limits', 'alembic_version',
)


def upgrade():
    # No browser-facing policies: the FastAPI database owner bypasses RLS and
    # enforces its own JWT ownership checks. Supabase anon/authenticated do not.
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')


def downgrade():
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
