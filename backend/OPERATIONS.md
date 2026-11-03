# Backend setup and operations

Use Python 3.11+ and install `backend/requirements.txt`. Install FFmpeg (including ffprobe) on the host; it is included in the backend Docker image. Root `requirement.txt` belongs to optional model experiments and is not the API installation manifest. Frontend development uses npm and its existing package-lock.json; pnpm files are retained for existing users.

From `backend/`, copy `.env.example` to `.env`, configure PostgreSQL, and run:

```sh
python database/init_db.py --seed
uvicorn app.main:app --reload --port 8000
```

For an existing database, back it up and run `python database/init_db.py` without `--seed`. This uses Alembic to adopt the complete existing schema and apply additive feedback fields. Partial schemas fail explicitly. Migration downgrades deliberately refuse destructive rollback; restore the backup or write a forward migration. Compose performs schema upgrades when starting the backend. Its database initialization scripts seed fresh database volumes only.

Production requires `ENVIRONMENT=production`, a random `SECRET_KEY` of at least 32 characters, and explicit `ALLOWED_ORIGINS`. Set the same Google OAuth client ID in backend and frontend. Optional Gemini feedback needs `GEMINI_API_KEY`; Google Speech needs application default credentials, `GOOGLE_APPLICATION_CREDENTIALS`, or `GOOGLE_CREDENTIALS_JSON` (a service-account JSON string supplied through your secret manager). Do not commit credentials. `GET /api/health` checks database connectivity.

Docker supports Google Speech directly. Local fallback is optional: install the Whisper CLI directly or in a Mamba environment named `whisper`; set `WHISPER_MODEL` and `WHISPER_ENV` if needed. Parler TTS remains an optional local model feature requiring its model dependencies in that environment. Browser question speech does not require Parler. Service status reports whether local Whisper executables are present; model readiness still requires a real transcription check.

Audio uploads require authentication and are decoded before analysis. Limits are 20 MB and five minutes. AI endpoints allow 10 attempts per user per 60-second window across all API workers. Migration 0003 installs the PostgreSQL counter. Failed requests also consume the attempt; the window resets after 60 seconds. A rejected request returns HTTP 429 with Retry-After. Google transcription normalizes input and splits it into 55-second chunks. Provider calls do not block the asynchronous event loop.

Recordings are private. Fetch `/api/practice/audio/{filename}` with the Bearer token; delete the same URL with DELETE to remove the recording while retaining practice history. Existing `/uploads/audio/*` URLs are no longer public. The UI retrieves recordings through authenticated blob requests.

For a 30-day audio retention policy, preview first and schedule the apply command when ready:

```sh
python database/cleanup_audio.py --days 30
python database/cleanup_audio.py --days 30 --apply
```

This deletes recording files only, keeping transcripts, feedback, and progress. Expired audio returns 404. Backups need their own retention settings. No purge runs automatically.

Progress dates use the API server's date; keep production hosts in UTC. Analytics hour buckets use stored database timestamps in UTC. Part completion counts distinct analyzed shared questions, whereas daily counts count submissions. Draft practice records do not increase progress.

AI grades are text estimates. Pronunciation cannot be measured from a transcript and is returned as null. Overall estimates average the three text criteria and round to half bands. These are practice estimates, not certified IELTS grades. Missing providers produce no fabricated scores. Mock tests select up to three Part 1 questions, one Part 2 question, and three Part 3 questions; each submitted answer is analyzed and the test stores averages once all answers have scores. This practice flow currently has no enforced exam timer.
