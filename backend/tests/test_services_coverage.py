"""Offline boundary tests for authentication, uploaded media and AI providers."""

import asyncio
import io
import json
import subprocess
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi import HTTPException, UploadFile

from app import auth
from app.services import gemini_feedback_service as gemini
from app.services import google_speech_service as speech
from app.services import whisper_service as whisper
from app.utils import uploads


class AuthCoverageTests(unittest.TestCase):
    def test_password_roundtrip_and_byte_limit(self):
        hashed = auth.get_password_hash("correct horse")
        self.assertTrue(auth.verify_password("correct horse", hashed))
        self.assertFalse(auth.verify_password("wrong", hashed))
        self.assertFalse(auth.verify_password("password", "malformed"))
        with self.assertRaises(HTTPException) as error:
            auth.get_password_hash("é" * 37)
        self.assertEqual(error.exception.status_code, 422)

    def test_authentication_rejects_missing_oauth_and_wrong_password(self):
        user = SimpleNamespace(password_hash="hash")
        for found, matches, expected in [
            (None, True, False),
            (SimpleNamespace(password_hash=None), True, False),
            (user, False, False),
            (user, True, user),
        ]:
            with (
                self.subTest(found=found, matches=matches),
                patch.object(auth, "get_user_by_username", return_value=found),
                patch.object(auth, "verify_password", return_value=matches),
            ):
                self.assertIs(
                    auth.authenticate_user(MagicMock(), "name", "password"), expected
                )

    def test_jwt_required_and_optional_identity(self):
        user = SimpleNamespace(username="alice")
        original = {"sub": "alice"}
        token = auth.create_access_token(original)
        self.assertNotIn("exp", original)
        with patch.object(auth, "get_user_by_username", return_value=user):
            self.assertIs(asyncio.run(auth.get_current_user(token, MagicMock())), user)
            self.assertIs(
                asyncio.run(auth.get_current_user_optional(token, MagicMock())), user
            )
        tokens = [
            "invalid",
            auth.create_access_token({}),
            auth.create_access_token(original, timedelta(seconds=-1)),
            token,
        ]
        with patch.object(auth, "get_user_by_username", return_value=None):
            for bad in tokens:
                with (
                    self.subTest(token_kind=tokens.index(bad)),
                    self.assertRaises(HTTPException) as error,
                ):
                    asyncio.run(auth.get_current_user(bad, MagicMock()))
                self.assertEqual(error.exception.status_code, 401)
                self.assertIsNone(
                    asyncio.run(auth.get_current_user_optional(bad, MagicMock()))
                )
        self.assertIsNone(
            asyncio.run(auth.get_current_user_optional(None, MagicMock()))
        )

    def test_google_verification_network_boundaries(self):
        with patch.object(auth.settings, "GOOGLE_CLIENT_ID", ""):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(auth.verify_google_token("fixture"))
            self.assertEqual(error.exception.status_code, 500)

        async def verify(response=None, failure=None):
            client = AsyncMock()
            client.get.side_effect = failure
            client.get.return_value = response
            context = AsyncMock()
            context.__aenter__.return_value = client
            with (
                patch.object(auth.settings, "GOOGLE_CLIENT_ID", "client-id"),
                patch.object(auth.httpx, "AsyncClient", return_value=context),
            ):
                return await auth.verify_google_token("fixture")

        request = httpx.Request("GET", "https://example.com")
        self.assertEqual(
            asyncio.run(
                verify(
                    httpx.Response(
                        200, request=request, json={"aud": "client-id", "sub": "alice"}
                    )
                )
            )["sub"],
            "alice",
        )
        for response, failure, code in [
            (httpx.Response(200, request=request, json={"aud": "other"}), None, 401),
            (httpx.Response(403, request=request), None, 401),
            (None, httpx.ConnectError("offline"), 503),
            (httpx.Response(200, request=request, content=b"bad json"), None, 401),
        ]:
            with self.subTest(code=code), self.assertRaises(HTTPException) as error:
                asyncio.run(verify(response, failure))
            self.assertEqual(error.exception.status_code, code)


class UploadCoverageTests(unittest.TestCase):
    def test_audio_validation_and_cleanup(self):
        probe = SimpleNamespace(
            returncode=0,
            stdout=json.dumps(
                {"streams": [{"codec_type": "audio"}], "format": {"duration": "1"}}
            ),
        )
        decoded = SimpleNamespace(returncode=0, stdout=b"\0\0" * 100)
        cases = [
            ("valid", b"audio", [probe, decoded], None),
            ("empty", b"", [], 422),
            ("too large", b"12345", [], 413),
            ("not audio", b"a", [SimpleNamespace(returncode=0, stdout="{}")], 422),
            ("probe failed", b"a", [SimpleNamespace(returncode=1, stdout="{}")], 422),
            (
                "decode failed",
                b"a",
                [probe, SimpleNamespace(returncode=1, stdout=b"")],
                422,
            ),
            (
                "empty decode",
                b"a",
                [probe, SimpleNamespace(returncode=0, stdout=b"")],
                422,
            ),
            (
                "too long",
                b"a",
                [
                    SimpleNamespace(
                        returncode=0,
                        stdout=json.dumps(
                            {
                                "streams": [{"codec_type": "audio"}],
                                "format": {"duration": "301"},
                            }
                        ),
                    ),
                    decoded,
                ],
                413,
            ),
            (
                "decoded too long",
                b"a",
                [
                    probe,
                    SimpleNamespace(returncode=0, stdout=b"x" * (300 * 8000 * 2 + 1)),
                ],
                413,
            ),
            ("bad json", b"a", [SimpleNamespace(returncode=0, stdout="invalid")], 422),
            ("no tool", b"a", FileNotFoundError(), 503),
            ("timeout", b"a", subprocess.TimeoutExpired("ffprobe", 15), 503),
        ]
        with tempfile.TemporaryDirectory() as directory:
            for label, content, results, status in cases:
                with self.subTest(label=label):
                    path = Path(directory) / "answer.wav"
                    with (
                        patch.object(
                            uploads, "MAX_BYTES", 4 if label == "too large" else 100
                        ),
                        patch.object(uploads.subprocess, "run", side_effect=results),
                    ):
                        if status:
                            with self.assertRaises(HTTPException) as error:
                                uploads.save_audio(
                                    UploadFile(file=io.BytesIO(content)), path
                                )
                            self.assertEqual(error.exception.status_code, status)
                            self.assertFalse(path.exists())
                        else:
                            uploads.save_audio(
                                UploadFile(file=io.BytesIO(content)), path
                            )
                            self.assertEqual(path.read_bytes(), content)
            with self.assertRaises(HTTPException) as error:
                uploads.save_audio(
                    UploadFile(file=io.BytesIO(b"a")), Path(directory) / "answer.exe"
                )
            self.assertEqual(error.exception.status_code, 415)


class FeedbackProviderCoverageTests(unittest.TestCase):
    def test_parse_provider_json_and_part_labels(self):
        for value in [
            '{"value": 1}',
            '```json\n{"value": 1}\n```',
            '```\n{"value": 1}\n```',
        ]:
            self.assertEqual(gemini.parse_gemini_response(value), {"value": 1})
        with self.assertRaises(ValueError):
            gemini.parse_gemini_response("not JSON")
        for part in [1, 2, 3, 99]:
            self.assertIn(str(part), gemini.get_part_description(part))

    def test_provider_scores_are_validated_and_recalculated(self):
        good = dict(
            fluency_score=6,
            vocabulary_score=6.5,
            grammar_score=7,
            pronunciation_score=9,
            overall_band=9,
            feedback="Useful feedback",
            strengths=["clear"],
            improvements=["range"],
            sample_corrections=[
                {"original": "I go", "corrected": "I went", "explanation": "past"}
            ],
        )
        model = MagicMock()

        def request(data):
            model.generate_content.return_value = SimpleNamespace(text=json.dumps(data))
            with patch.object(gemini, "get_gemini_client", return_value=model):
                return asyncio.run(
                    gemini.get_ielts_feedback(
                        "A sufficiently long spoken answer.", "Why?", 2
                    )
                )

        result = request(good)
        self.assertEqual(float(result.overall_band), 6.5)
        self.assertIsNone(result.pronunciation_score)
        self.assertIn("I went", gemini.format_feedback_text(result))
        for field, value in [
            ("fluency_score", -1),
            ("vocabulary_score", 9.5),
            ("grammar_score", 6.25),
            ("fluency_score", "NaN"),
            ("strengths", "clear"),
            ("improvements", [2]),
            ("sample_corrections", ["bad"]),
        ]:
            with self.subTest(field=field, value=value):
                self.assertIsNone(request({**good, field: value}))
        model.generate_content.side_effect = RuntimeError("offline")
        with patch.object(gemini, "get_gemini_client", return_value=model):
            self.assertIsNone(
                asyncio.run(gemini.get_ielts_feedback("Long enough response.", "?"))
            )
            short = asyncio.run(gemini.get_ielts_feedback("short", "?"))
            self.assertEqual(short.overall_band, 0)
            short.strengths = []
            short.improvements = []
            short.sample_corrections = ["ignored"]
            self.assertIn("Tiếp tục", gemini.format_feedback_text(short))
        with patch.object(gemini, "get_gemini_client", return_value=None):
            self.assertIsNone(
                asyncio.run(gemini.get_ielts_feedback("Long enough response.", "?"))
            )

    def test_client_configuration_and_sync_wrappers(self):
        with patch.object(gemini, "GEMINI_AVAILABLE", False):
            self.assertIsNone(gemini.get_gemini_client())
        with (
            patch.object(gemini, "GEMINI_AVAILABLE", True),
            patch.object(gemini.os, "getenv", return_value=None),
        ):
            self.assertIsNone(gemini.get_gemini_client())
        fake = MagicMock()
        with (
            patch.object(gemini, "GEMINI_AVAILABLE", True),
            patch.object(gemini.os, "getenv", return_value="fixture"),
            patch.object(gemini, "genai", fake, create=True),
        ):
            self.assertIs(gemini.get_gemini_client(), fake.GenerativeModel.return_value)
        with patch.object(
            gemini, "get_ielts_feedback", new=AsyncMock(return_value="feedback")
        ):
            self.assertEqual(gemini.get_ielts_feedback_sync("answer", "?"), "feedback")

            async def nested():
                self.assertIsNone(gemini.get_ielts_feedback_sync("answer", "?"))

            asyncio.run(nested())


class SpeechCoverageTests(unittest.TestCase):
    def test_fallback_success_and_failure(self):
        path = Path("/tmp/fixture.wav")
        with (
            patch.object(speech, "GOOGLE_SPEECH_AVAILABLE", True),
            patch.object(
                speech, "transcribe_audio_google", return_value="Google answer"
            ) as google,
            patch.object(
                whisper, "transcribe_audio", return_value="Whisper answer"
            ) as local,
        ):
            self.assertEqual(
                speech.transcribe_with_fallback(path), ("Google answer", "google")
            )
            local.assert_not_called()
            google.side_effect = RuntimeError("google unavailable")
            self.assertEqual(
                speech.transcribe_with_fallback(path), ("Whisper answer", "whisper")
            )
            local.return_value = " "
            with self.assertRaisesRegex(Exception, "Both transcription methods failed"):
                speech.transcribe_with_fallback(path)
            with self.assertRaisesRegex(Exception, "Whisper transcription failed"):
                speech.transcribe_with_fallback(path, use_google=False)
        with patch.object(speech, "GOOGLE_SPEECH_AVAILABLE", False):
            self.assertIsNone(speech.get_speech_client())
            with self.assertRaisesRegex(RuntimeError, "library"):
                speech.transcribe_audio_google(path)
        with (
            patch.object(speech, "GOOGLE_SPEECH_AVAILABLE", True),
            patch.object(speech, "get_speech_client", return_value=None),
        ):
            with self.assertRaisesRegex(RuntimeError, "credentials"):
                speech.transcribe_audio_google(path)

    def test_whisper_cli_commands_and_output(self):
        def run(command, **kwargs):
            directory = command[command.index("--output_dir") + 1]
            (Path(directory) / "sample.json").write_text(
                json.dumps({"text": " recognized words "})
            )

        with (
            patch.object(whisper.subprocess, "run", side_effect=run),
            patch.object(whisper.shutil, "which", return_value="/bin/whisper"),
        ):
            self.assertEqual(
                whisper.transcribe_audio_simple(Path("/tmp/sample.wav")),
                "recognized words",
            )

        def empty(command, **kwargs):
            directory = command[command.index("--output_dir") + 1]
            (Path(directory) / "sample.json").write_text('{"text": " "}')

        with (
            patch.object(whisper.subprocess, "run", side_effect=empty),
            patch.object(whisper.shutil, "which", return_value=None),
        ):
            with self.assertRaisesRegex(RuntimeError, "No speech"):
                whisper.transcribe_audio(Path("/tmp/sample.wav"))
