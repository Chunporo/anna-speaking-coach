"""Share AI request limits across API processes."""

from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade():
    op.execute("""CREATE TABLE IF NOT EXISTS ai_request_limits (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        window_started TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0)
    )""")


def downgrade():
    op.execute("DROP TABLE ai_request_limits")
