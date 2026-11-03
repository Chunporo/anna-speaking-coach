# IELTS Speaking Practice API

FastAPI, SQLAlchemy and PostgreSQL backend. Python 3.11+ and FFmpeg/ffprobe are required.

From this directory:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Configure `DATABASE_URL` in `.env` and create that PostgreSQL database before continuing:

```sh
python database/init_db.py --seed
uvicorn app.main:app --reload --port 8000
```

On existing databases, omit `--seed`; `init_db.py` applies versioned Alembic migrations. API documentation is at http://localhost:8000/docs and readiness at `/api/health`.

See [OPERATIONS.md](OPERATIONS.md) for production configuration, migrations, optional AI services, private recordings, request limits, and retention. The shared question APIs are public; practice, mock tests, feedback, progress and recording APIs require Bearer authentication.
