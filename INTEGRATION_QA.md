# Real-backend verification — 2026-11-03

The redesigned production frontend was checked against the real FastAPI application and an isolated PostgreSQL database. Database state, uploads and signing configuration were kept under a temporary directory. Developer `.env` files were excluded from the verification process, and no production accounts or recordings were used.

## Passed

- All seven backend integration regressions pass against a fresh migrated and seeded PostgreSQL database. Provider-success branches in those automated tests mock external AI responses.
- Browser registration creates a real database user, signs in and loads the dashboard.
- Creating a custom question persists it; its custom practice URL retrieves the correct question even when numeric IDs overlap shared questions.
- A browser-generated synthetic audio stream was recorded through the actual MediaRecorder implementation, stopped and submitted to the real audio analysis endpoint.
- With speech providers unavailable, analysis returns HTTP 503. The local recording remains replayable and retryable.
- After that failed analysis, actual daily progress and submitted-question history both remain zero.
- Starting a Part 1 mock test creates a real test record and opens a selected question. Submission stays disabled until a recording exists.

## Not verified

This environment has no `whisper` Mamba environment or directly installed Whisper CLI, and the isolated test server intentionally has no paid speech/feedback credentials. Therefore live transcription, Gemini scoring, Google OAuth and complete provider-backed mock-test scoring were not claimed as passing. Physical microphones and Safari still require device checks.

GitHub authentication is valid. Vercel authentication is expired and needs an interactive `vercel login` before creating a hosted preview. Changes are prepared on a review branch because the repository has existing production deployment hooks.
