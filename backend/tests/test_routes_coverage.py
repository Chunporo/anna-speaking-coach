"""Database-backed API contract tests using the dedicated test database only."""

import asyncio
import io
import json
import os
import unittest
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

from app import auth, models
from app.database import SessionLocal
from app.main import app
from app.routers import feedback, transcription
from app.services.gemini_feedback_service import IELTSFeedback


def scored_feedback():
    return IELTSFeedback(
        Decimal("6"),
        Decimal("6.5"),
        Decimal("7"),
        None,
        Decimal("6.5"),
        "Specific feedback",
        ["clear"],
        ["range"],
        [{"original": "go", "corrected": "went"}],
    )


class OfflineRouterCoverageTests(unittest.TestCase):
    def test_feedback_status_and_analysis(self):
        def status(**patches):
            with (
                patch.multiple(feedback, **patches),
                patch.object(feedback.os, "getenv", return_value=None),
            ):
                return json.loads(asyncio.run(feedback.get_feedback_status()).body)

        self.assertFalse(status(GEMINI_AVAILABLE=False)["gemini_feedback"]["available"])
        self.assertIn(
            "environment", status(GEMINI_AVAILABLE=True)["gemini_feedback"]["error"]
        )
        for client in [None, object()]:
            with (
                patch.object(feedback, "GEMINI_AVAILABLE", True),
                patch.object(feedback.os, "getenv", return_value="fixture"),
                patch.object(feedback, "get_gemini_client", return_value=client),
            ):
                self.assertEqual(
                    json.loads(asyncio.run(feedback.get_feedback_status()).body)[
                        "gemini_feedback"
                    ]["available"],
                    client is not None,
                )
        valid = feedback.FeedbackRequest(
            transcription="An adequately long answer.", question="Why?"
        )
        for request, result, exception, code in [
            (
                feedback.FeedbackRequest(transcription=" " * 12, question="?"),
                None,
                None,
                400,
            ),
            (
                feedback.FeedbackRequest(
                    transcription="Long enough answer.", question="?", part=4
                ),
                None,
                None,
                400,
            ),
            (valid, None, None, 503),
            (valid, None, RuntimeError("offline"), 500),
            (valid, scored_feedback(), None, None),
        ]:
            with patch.object(
                feedback,
                "get_ielts_feedback",
                new=AsyncMock(return_value=result, side_effect=exception),
            ):
                if code:
                    with self.assertRaises(HTTPException) as error:
                        asyncio.run(
                            feedback.analyze_transcription(
                                request, SimpleNamespace(id=1)
                            )
                        )
                    self.assertEqual(error.exception.status_code, code)
                else:
                    response = asyncio.run(
                        feedback.analyze_transcription(request, SimpleNamespace(id=1))
                    )
                    self.assertIsNone(response.pronunciation_score)
                    self.assertEqual(response.overall_band, 6.5)

    def test_transcription_status_and_cleanup(self):
        import tempfile
        from pathlib import Path

        for available, client, executable in [
            (False, None, None),
            (True, None, None),
            (True, object(), "/bin/whisper"),
        ]:
            with (
                patch.object(transcription, "GOOGLE_SPEECH_AVAILABLE", available),
                patch.object(transcription, "get_speech_client", return_value=client),
                patch.object(transcription.shutil, "which", return_value=executable),
            ):
                response = json.loads(
                    asyncio.run(transcription.get_transcription_status()).body
                )
                self.assertEqual(
                    response["google_speech"]["available"],
                    available and client is not None,
                )
                self.assertEqual(
                    response["whisper"]["available"], executable is not None
                )
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(transcription, "UPLOAD_DIR", Path(directory)),
        ):

            def save(audio, path):
                path.write_bytes(b"audio")

            for result, failure, status in [
                (("recognized words", "google"), None, None),
                (("recognized words", "whisper"), None, None),
                (None, RuntimeError("offline"), 500),
                (None, HTTPException(422, "invalid"), 422),
            ]:
                with (
                    patch.object(transcription, "save_audio", side_effect=save),
                    patch.object(
                        transcription,
                        "transcribe_with_fallback",
                        return_value=result,
                        side_effect=failure,
                    ),
                ):
                    upload = UploadFile(
                        filename="answer.wav", file=io.BytesIO(b"audio")
                    )
                    if status:
                        with self.assertRaises(HTTPException) as error:
                            asyncio.run(
                                transcription.transcribe_audio(
                                    upload, True, "en-US", SimpleNamespace(id=1)
                                )
                            )
                        self.assertEqual(error.exception.status_code, status)
                    else:
                        response = json.loads(
                            asyncio.run(
                                transcription.transcribe_audio(
                                    upload, True, "en-US", SimpleNamespace(id=1)
                                )
                            ).body
                        )
                        self.assertEqual(response["method"], result[1])
                    self.assertEqual(list(Path(directory).iterdir()), [])


@unittest.skipUnless(
    os.getenv("TEST_DATABASE_URL"), "Dedicated TEST_DATABASE_URL required"
)
class ApiCoverageTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.name = "coverage_" + uuid.uuid4().hex[:12]
        response = self.client.post(
            "/api/auth/register",
            json={
                "username": self.name,
                "email": self.name + "@example.com",
                "password": "strong-password",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.user_id = response.json()["id"]
        self.headers = {
            "Authorization": "Bearer " + auth.create_access_token({"sub": self.name})
        }
        self.question = self.client.get("/api/questions/?part=1").json()[0]

    def tearDown(self):
        with SessionLocal() as db:
            db.query(models.User).filter_by(id=self.user_id).delete()
            db.commit()

    def get(self, url):
        response = self.client.get(url, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_auth_duplicate_registration_and_google_accounts(self):
        payload = {
            "username": self.name,
            "email": self.name + "@example.com",
            "password": "strong-password",
        }
        self.assertEqual(
            self.client.post("/api/auth/register", json=payload).status_code, 400
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/register", json={**payload, "username": self.name + "other"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/login", data={"username": self.name, "password": "wrong"}
            ).status_code,
            401,
        )
        self.assertEqual(self.get("/api/auth/me")["id"], self.user_id)
        for info, code in [
            ({"email_verified": False}, 401),
            ({"email_verified": True}, 400),
            (
                {
                    "sub": "google-" + self.name,
                    "email": payload["email"],
                    "email_verified": "true",
                },
                200,
            ),
        ]:
            with patch(
                "app.auth.verify_google_token", new=AsyncMock(return_value=info)
            ):
                self.assertEqual(
                    self.client.post(
                        "/api/auth/google", json={"token": "fixture"}
                    ).status_code,
                    code,
                )
        info = {
            "sub": "google-" + self.name,
            "email": payload["email"],
            "email_verified": True,
        }
        with patch("app.auth.verify_google_token", new=AsyncMock(return_value=info)):
            self.assertEqual(
                self.client.post(
                    "/api/auth/google", json={"token": "fixture"}
                ).status_code,
                200,
            )

    def test_question_filters_tts_and_custom_deletion(self):
        self.assertTrue(
            self.get("/api/questions/?part=1&topic=" + self.question["topic"])
        )
        self.assertIn(self.question["topic"], self.get("/api/questions/topics?part=1"))
        self.assertEqual(
            self.get("/api/questions/" + str(self.question["id"]))["id"],
            self.question["id"],
        )
        self.assertEqual(self.client.get("/api/questions/99999999").status_code, 404)
        url = "/api/questions/" + str(self.question["id"]) + "/audio"
        with patch(
            "app.services.tts_service.get_tts_audio_url",
            return_value="/uploads/tts/fixture.wav",
        ):
            self.assertEqual(self.get(url)["audio_url"], "/uploads/tts/fixture.wav")
        with patch(
            "app.services.tts_service.get_tts_audio_url",
            side_effect=RuntimeError("offline"),
        ):
            self.assertEqual(
                self.client.get(url, headers=self.headers).status_code, 500
            )
        self.assertEqual(
            self.client.get(
                "/api/questions/99999999/audio", headers=self.headers
            ).status_code,
            404,
        )
        response = self.client.post(
            "/api/questions/user-questions",
            headers=self.headers,
            json={
                "part": 2,
                "topic": "Books",
                "question_text": "Describe your favorite book.",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        ident = response.json()["id"]
        self.assertEqual(len(self.get("/api/questions/user-questions?part=2")), 1)
        self.assertEqual(
            self.client.delete(
                f"/api/questions/user-questions/{ident}", headers=self.headers
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.delete(
                f"/api/questions/user-questions/{ident}", headers=self.headers
            ).status_code,
            404,
        )

    def test_draft_and_analysis_rejection_contracts(self):
        base = {"question_id": self.question["id"], "part": 1}
        for payload in [
            {"part": 1},
            {**base, "user_question_id": 1},
            {**base, "part": 2},
            {**base, "transcription": "forged"},
            {"part": 1, "user_question_id": 999999},
        ]:
            self.assertIn(
                self.client.post(
                    "/api/practice/", headers=self.headers, json=payload
                ).status_code,
                [404, 422],
            )
        response = self.client.post("/api/practice/", headers=self.headers, json=base)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(self.get("/api/practice/")), 1)
        for data, code in [
            ({"part": 1}, 422),
            ({"part": 1, "question_id": 999999}, 404),
            ({**base, "part": 2}, 422),
        ]:
            response = self.client.post(
                "/api/practice/analyze",
                headers=self.headers,
                data=data,
                files={"audio": ("answer.wav", b"audio", "audio/wav")},
            )
            self.assertEqual(response.status_code, code, response.text)
        for failure, text, code in [
            (RuntimeError("offline"), "", 503),
            (None, "short", 422),
        ]:
            with (
                patch("app.routers.practice.save_audio"),
                patch(
                    "app.services.google_speech_service.transcribe_with_fallback",
                    side_effect=failure,
                    return_value=(text, "google"),
                ),
            ):
                response = self.client.post(
                    "/api/practice/analyze",
                    headers=self.headers,
                    data=base,
                    files={"audio": ("answer.wav", b"audio", "audio/wav")},
                )
                self.assertEqual(response.status_code, code, response.text)
        for url in ["/api/practice/audio/missing.wav", "/api/practice/feedback/999999"]:
            self.assertEqual(
                self.client.get(url, headers=self.headers).status_code, 404
            )
        self.assertEqual(
            self.client.delete(
                "/api/practice/audio/missing.wav", headers=self.headers
            ).status_code,
            404,
        )

    def test_scored_feedback_history_and_summary(self):
        self.assertEqual(
            self.get("/api/practice/feedback/stats/summary")["total_sessions"], 0
        )
        with SessionLocal() as db:
            for part, score in [(1, 6), (2, 7)]:
                db.add(
                    models.PracticeSession(
                        user_id=self.user_id,
                        question_id=self.question["id"],
                        part=part,
                        audio_url=f"/uploads/audio/fixture-{part}.wav",
                        overall_band=score,
                        fluency_score=score,
                        vocabulary_score=score,
                        grammar_score=score,
                        feedback="Useful",
                        feedback_strengths="invalid",
                        feedback_improvements="invalid",
                        feedback_corrections="invalid",
                    )
                )
            db.commit()
        history = self.get("/api/practice/feedback/history?part=1&limit=1&offset=0")
        self.assertEqual(len(history), 1)
        detail = self.get("/api/practice/feedback/" + str(history[0]["id"]))
        self.assertEqual(detail["question_text"], self.question["question_text"])
        self.assertEqual(detail["strengths"], [])
        self.assertEqual(detail["improvements"], [])
        self.assertEqual(detail["corrections"], [])
        stats = self.get("/api/practice/feedback/stats/summary")
        self.assertEqual(stats["average_overall_band"], 6.5)
        self.assertEqual(stats["highest_band"], 7)
        self.assertEqual(stats["by_part"]["part_1"]["count"], 1)

    def test_progress_analytics_real_aggregates(self):
        today = date.today()
        self.assertEqual(self.get("/api/progress/streak")["current_streak"], 0)
        empty = self.get("/api/progress/streak-analytics")
        self.assertEqual(empty["total_completions"], 0)
        with SessionLocal() as db:
            streak = db.query(models.Streak).filter_by(user_id=self.user_id).one()
            streak.current_streak = 2
            streak.longest_streak = 3
            streak.last_activity_date = today - timedelta(days=2)
            for offset, count in [(5, 1), (4, 2), (2, 3)]:
                db.add(
                    models.ActivityCalendar(
                        user_id=self.user_id,
                        date=today - timedelta(days=offset),
                        practice_count=count,
                    )
                )
            for hour in [7, 13, 19, 23]:
                db.add(
                    models.PracticeSession(
                        user_id=self.user_id,
                        question_id=self.question["id"],
                        part=1,
                        audio_url="/uploads/audio/fixture.wav",
                        created_at=datetime.combine(today, datetime.min.time()).replace(
                            hour=hour
                        ),
                    )
                )
            db.commit()
        analytics = self.get(
            f"/api/progress/streak-analytics?year={today.year}&month={today.month}"
        )
        self.assertEqual(analytics["total_completions"], 6)
        self.assertEqual(analytics["off_days"], 2)
        self.assertEqual(
            [x["streak_length"] for x in analytics["streak_history"]], [2, 1]
        )
        self.assertTrue(all(x["total_practice"] == 1 for x in analytics["time_of_day"]))
        self.assertEqual(
            sum(x["total_practice"] for x in analytics["weekly_pattern"]), 6
        )
        self.assertEqual(self.get("/api/progress/streak")["current_streak"], 0)
        self.assertEqual(len(self.get("/api/progress/activity-calendar")), 3)
        parts = self.get("/api/progress/part-progress")
        self.assertEqual(parts[0]["completed_count"], 1)
        self.assertEqual(self.get("/api/progress/part-progress"), parts)

    def test_mock_test_missing_invalid_and_full_selection(self):
        self.assertEqual(
            self.client.get("/api/mock-test/999999", headers=self.headers).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                "/api/mock-test/999999/answers/1",
                headers=self.headers,
                json={"session_id": 1},
            ).status_code,
            404,
        )
        response = self.client.post(
            "/api/mock-test/", headers=self.headers, json={"test_type": "FULL"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        test = response.json()
        self.assertEqual(len(self.get("/api/mock-test/")), 1)
        rows = self.get(f"/api/mock-test/{test['id']}/questions")
        self.assertEqual({row["part"] for row in rows}, {1, 2, 3})
        self.assertEqual(
            self.client.post(
                f"/api/mock-test/{test['id']}/answers/{rows[0]['question_id']}",
                headers=self.headers,
                json={"session_id": 999999},
            ).status_code,
            422,
        )
