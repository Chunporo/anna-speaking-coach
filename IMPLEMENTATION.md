# Repository repair progress

Implemented in priority order; existing local edits were preserved.

- [x] Fix fresh schema feedback fields and duplicate index; add versioned Alembic migrations for fresh and existing databases.
- [x] Fix login token storage and registration login flow; restore missing frontend library sources to Git visibility.
- [x] Validate production secrets and CORS origins; require verified Google email for account linking.
- [x] Validate and decode audio, limit uploads to 20 MB / 5 minutes, require authentication, and serve recordings only to their owner.
- [x] Add database-backed burst protection (10 AI requests/user/minute across API workers); add recording deletion and explicit retention cleanup commands.
- [x] Remove fabricated default grades; fail transcription cleanly; validate AI score ranges; show pronunciation as unavailable when only text is analyzed.
- [x] Serialize progress updates per user; count distinct analyzed questions for part completion; exclude draft sessions; correct stale streaks and calendar month arithmetic.
- [x] Complete mock test question selection, recording, answer submission, completion and aggregate scores.
- [x] Restore pronunciation lesson content needed for frontend compilation; normalize decimal scores for frontend rendering.
- [x] Support browser audio formats and five-minute recordings; split Google transcription into short normalized chunks; run optional local Whisper without shell activation.
- [x] Add database readiness checks, Docker environment wiring, build exclusions, CI checks, and setup/operations documentation.
- [x] Verify fresh migrations, repeated migration execution, PostgreSQL integration regressions, TypeScript checking, frontend production build, backend Docker image build, and integration tests inside Docker.

## Follow-up repairs

- [x] Reject older mock tests without questions instead of showing a completed state.
- [x] Test shared request limits under 20 concurrent attempts, a separate worker process, and window expiry. Six integration regressions and the frontend production build pass.

- [x] Complete private custom-question creation, retrieval, recording analysis and history; test ownership.
- [x] Make the answered-question filter functional and repair mobile content/sidebar overflow.
- [x] Fix recorder stop/reset races and release audio URLs; add three lifecycle tests to CI.
- [x] Run local production browser checks for registration, login, logout, questions and mock-test startup. See BROWSER_QA.md.

## Remaining deployment verification

- [ ] Exercise real Google OAuth, Google Speech, Gemini and optional local Whisper/TTS with deployment credentials and installed models. Automated integration checks mock paid AI providers.
- [ ] Validate the deployed UI with real microphones on Safari/mobile and a full browser session.
- [ ] Apply migrations to a backed-up copy of the actual existing deployment before release. Local migration verification uses an isolated PostgreSQL database.
- [x] Share the AI request limit across API workers using an atomic PostgreSQL counter (migration 0003). Concurrent limit and expiry tests pass.
- [ ] Schedule the retention command for the chosen retention period; no existing recordings were purged by this implementation.

## Validation commands

From the repository root:

```sh
cd backend
python database/init_db.py --seed  # Fresh database only; omit --seed on existing databases
cd ../frontend
npm ci
npm run build
```

Use a dedicated seeded PostgreSQL database for integration tests:

```sh
TEST_DATABASE_URL=postgresql://... PYTHONPATH=backend backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

Old `backend/test_*.py` files are manual diagnostics and data generators, not a safe automated test suite. In particular, `test_practice.py` writes records to its configured server.
