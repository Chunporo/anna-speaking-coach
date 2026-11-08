from alembic import context
from sqlalchemy import create_engine

from app.core.config import settings


def run():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


run()
