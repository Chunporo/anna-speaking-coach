"""Initialize schema through versioned migrations; optionally load question seeds."""
import argparse
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')

def init_database(seed=False, seed_if_empty=False):
    command.upgrade(Config(str(ROOT / 'alembic.ini')), 'head')
    if seed or seed_if_empty:
        engine = create_engine(os.environ['DATABASE_URL'])
        with engine.begin() as connection:
            if connection.execute(text('SELECT count(*) FROM questions')).scalar():
                if seed_if_empty:
                    return
                raise RuntimeError('Questions already exist; refusing to duplicate seed data')
            connection.exec_driver_sql((ROOT / 'database/seed_data.sql').read_text())

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed', action='store_true')
    parser.add_argument('--seed-if-empty', action='store_true')
    args = parser.parse_args()
    init_database(args.seed, args.seed_if_empty)
