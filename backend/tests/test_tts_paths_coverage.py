"""Regression for launching the backend from an isolated working directory."""
from pathlib import Path
import unittest
import uuid

from fastapi.testclient import TestClient
from app.main import app
from app.services.tts_service import TTS_OUTPUT_DIR


class TtsPathTests(unittest.TestCase):
    def test_generated_question_audio_uses_the_served_directory(self):
        name = uuid.uuid4().hex + '.wav'
        path = Path(TTS_OUTPUT_DIR) / name
        path.write_bytes(b'question-audio-fixture')
        try:
            response = TestClient(app).get('/uploads/tts/' + name)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content, b'question-audio-fixture')
        finally:
            path.unlink(missing_ok=True)
