"""Add nullable feedback columns to existing installations."""
from alembic import op
revision = '0002'
down_revision = '0001'

def upgrade():
    for name, kind in [('overall_band', 'DECIMAL(3,2)'), ('feedback_strengths', 'TEXT'),
                       ('feedback_improvements', 'TEXT'), ('feedback_corrections', 'TEXT')]:
        op.execute(f'ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS {name} {kind}')

def downgrade():
    raise RuntimeError('Forward-only migration; preserve recorded feedback and restore backup if necessary')
