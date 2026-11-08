"""Adopt an existing complete schema or initialize a new database."""

from pathlib import Path

from alembic import op
from sqlalchemy import inspect

revision = "0001"
down_revision = None


def upgrade():
    tables = set(inspect(op.get_bind()).get_table_names())
    required = {
        "users",
        "questions",
        "user_questions",
        "practice_sessions",
        "mock_tests",
        "mock_test_questions",
        "daily_progress",
        "streaks",
        "activity_calendar",
        "part_progress",
    }
    if tables & required:
        if not required <= tables:
            raise RuntimeError(
                "Existing database is incomplete; restore missing tables before migration"
            )
        return
    sql = (Path(__file__).parents[1] / "baseline.sql").read_text()
    op.get_bind().exec_driver_sql(sql)


def downgrade():
    raise RuntimeError("Baseline is irreversible; restore a database backup")
