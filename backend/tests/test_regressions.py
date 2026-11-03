"""Integration regressions. Use a dedicated migrated database via TEST_DATABASE_URL."""
import asyncio
import io
import os
import unittest
import uuid
import wave
from unittest.mock import AsyncMock, patch

if os.getenv('TEST_DATABASE_URL'):
    os.environ['DATABASE_URL'] = os.environ['TEST_DATABASE_URL']

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models

@unittest.skipUnless(os.getenv('TEST_DATABASE_URL'), 'Dedicated TEST_DATABASE_URL required')
class FlowTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.username = 'regression_' + uuid.uuid4().hex[:12]
        response = self.client.post('/api/auth/register', json={'username': self.username, 'email': self.username+'@example.com', 'password': 'strong-password'})
        self.assertEqual(response.status_code, 200, response.text)
        self.user_id = response.json()['id']
        token = self.client.post('/api/auth/login', data={'username': self.username, 'password': 'strong-password'}).json()['access_token']
        self.headers = {'Authorization': 'Bearer '+token}
        self.question = self.client.get('/api/questions/').json()[0]

    def tearDown(self):
        with SessionLocal() as db:
            sessions = db.query(models.PracticeSession).filter_by(user_id=self.user_id).all()
            from pathlib import Path
            for session in sessions:
                if session.audio_url:
                    Path('uploads/audio', session.audio_url.split('/')[-1]).unlink(missing_ok=True)
            db.query(models.User).filter_by(id=self.user_id).delete()
            db.commit()

    def test_auth_custom_questions_and_drafts(self):
        response = self.client.get('/api/questions/user-questions', headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        response = self.client.post('/api/practice/', headers=self.headers, json={'part': self.question['part'], 'question_id': self.question['id']})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get('/api/progress/daily', headers=self.headers).json()['practice_count'], 0)
        self.assertEqual(self.client.post('/api/transcription/transcribe').status_code, 401)
        self.assertEqual(self.client.get('/uploads/audio/private.webm').status_code, 404)

    def test_upload_analysis_mock_and_ownership(self):
        bad = self.client.post('/api/practice/analyze', headers=self.headers, data={'question_id': self.question['id'], 'part': self.question['part']}, files={'audio': ('bad.wav', b'not audio', 'audio/wav')})
        self.assertEqual(bad.status_code, 422, bad.text)
        test = self.client.post('/api/mock-test/', headers=self.headers, json={'test_type': 'PART1'}).json()
        rows = self.client.get(f"/api/mock-test/{test['id']}/questions", headers=self.headers).json()
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as audio:
            audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(16000); audio.writeframes(b'\0\0'*16000)
        for row in rows:
            with patch('app.services.google_speech_service.transcribe_with_fallback', return_value=('A sufficiently long answer about my everyday life.', 'google')), patch('app.routers.practice.get_ielts_feedback', new=AsyncMock(return_value=None)):
                response = self.client.post('/api/practice/analyze', headers=self.headers, data={'question_id': row['question_id'], 'part': row['part']}, files={'audio': ('answer.wav', buffer.getvalue(), 'audio/wav')})
            self.assertEqual(response.status_code, 200, response.text)
            session = response.json()
            self.assertIsNone(session['overall_band'])
            filename = session['audio_url'].split('/')[-1]
            self.assertEqual(self.client.get('/api/practice/audio/'+filename).status_code, 401)
            self.assertEqual(self.client.get('/api/practice/audio/'+filename, headers=self.headers).status_code, 200)
            response = self.client.post(f"/api/mock-test/{test['id']}/answers/{row['question_id']}", headers=self.headers, json={'session_id': session['id']})
            self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()['complete'])
        self.assertEqual(self.client.get('/api/progress/daily', headers=self.headers).json()['practice_count'], len(rows))

    def test_concurrent_progress_updates(self):
        from concurrent.futures import ThreadPoolExecutor
        from app.utils.progress import update_all_progress
        def submit(_):
            with SessionLocal() as db:
                db.add(models.PracticeSession(user_id=self.user_id, question_id=self.question['id'], part=self.question['part'], audio_url='/uploads/audio/'+uuid.uuid4().hex+'.wav'))
                update_all_progress(db, self.user_id, self.question['part'])
                db.commit()
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(submit, range(8)))
        with SessionLocal() as db:
            self.assertEqual(db.query(models.DailyProgress).filter_by(user_id=self.user_id).one().practice_count, 8)
            self.assertEqual(db.query(models.ActivityCalendar).filter_by(user_id=self.user_id).one().practice_count, 8)
            self.assertEqual(db.query(models.PartProgress).filter_by(user_id=self.user_id).one().completed_count, 1)

    def test_reject_forged_recording_reference(self):
        response = self.client.post('/api/practice/', headers=self.headers, json={'question_id': self.question['id'], 'part': self.question['part'], 'audio_url': '/uploads/audio/another-user.wav'})
        self.assertEqual(response.status_code, 422)

    def test_shared_request_limit_is_atomic_and_expires(self):
        from concurrent.futures import ThreadPoolExecutor
        from fastapi import HTTPException
        from sqlalchemy import text
        from app.utils.rate_limit import enforce_ai_limit

        def attempt(_):
            try:
                enforce_ai_limit(self.user_id)
                return True
            except HTTPException as error:
                self.assertEqual(error.status_code, 429)
                self.assertEqual(error.headers['Retry-After'], '60')
                return False

        with ThreadPoolExecutor(max_workers=8) as pool:
            accepted = list(pool.map(attempt, range(20)))
        self.assertEqual(sum(accepted), 10)
        # A new interpreter represents another worker with no shared process memory.
        import subprocess
        import sys
        worker = subprocess.run([sys.executable, '-c',
            'from app.utils.rate_limit import enforce_ai_limit; '
            'from fastapi import HTTPException; '
            + '\ntry: enforce_ai_limit(' + str(self.user_id) + ')'
            + '\nexcept HTTPException as error: print(error.status_code)'],
            capture_output=True, text=True, check=True)
        self.assertEqual(worker.stdout.strip(), '429')
        with SessionLocal() as db:
            row = db.get(models.AIRequestLimit, self.user_id)
            self.assertEqual(row.request_count, 10)
            db.execute(text("UPDATE ai_request_limits SET window_started = CURRENT_TIMESTAMP - INTERVAL '61 seconds' WHERE user_id = :user"), {'user': self.user_id})
            db.commit()
        self.assertTrue(attempt(0))
        with SessionLocal() as db:
            self.assertEqual(db.get(models.AIRequestLimit, self.user_id).request_count, 1)

    def test_legacy_mock_without_questions_is_not_completed(self):
        with SessionLocal() as db:
            test = models.MockTest(user_id=self.user_id, test_type='PART1')
            db.add(test)
            db.commit()
            test_id = test.id
        response = self.client.get(f'/api/mock-test/{test_id}/questions', headers=self.headers)
        self.assertEqual(response.status_code, 409)
        self.assertIn('no questions', response.json()['detail'])

    def test_custom_question_analysis_and_ownership(self):
        response = self.client.post('/api/questions/user-questions', headers=self.headers, json={'part': 2, 'topic': 'Private topic', 'question_text': 'Describe a book you enjoyed.'})
        self.assertEqual(response.status_code, 200, response.text)
        question_id = response.json()['id']
        self.assertEqual(self.client.get(f'/api/questions/user-questions/{question_id}', headers=self.headers).status_code, 200)
        from app.auth import create_access_token
        with SessionLocal() as db:
            other = models.User(username='other_'+uuid.uuid4().hex[:12], email=uuid.uuid4().hex+'@example.com')
            db.add(other); db.commit(); other_id, other_name = other.id, other.username
        other_headers = {'Authorization': 'Bearer '+create_access_token({'sub': other_name})}
        try:
            self.assertEqual(self.client.get(f'/api/questions/user-questions/{question_id}', headers=other_headers).status_code, 404)
            buffer = io.BytesIO()
            with wave.open(buffer, 'wb') as audio:
                audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(16000); audio.writeframes(b'\0\0'*16000)
            with patch('app.services.google_speech_service.transcribe_with_fallback', return_value=('I really enjoyed reading this book last year.', 'google')), patch('app.routers.practice.get_ielts_feedback', new=AsyncMock(return_value=None)):
                response = self.client.post('/api/practice/analyze', headers=self.headers, data={'user_question_id': question_id, 'part': 2}, files={'audio': ('answer.wav', buffer.getvalue(), 'audio/wav')})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertIsNone(response.json()['question_id'])
            self.assertEqual(response.json()['user_question_id'], question_id)
            filename = response.json()['audio_url'].split('/')[-1]
            self.assertEqual(self.client.get('/api/practice/audio/'+filename, headers=other_headers).status_code, 404)
            self.assertEqual(self.client.get(f'/api/practice/question/{question_id}?custom=true', headers=self.headers).json()['total_practices'], 1)
            self.assertEqual(self.client.get(f'/api/practice/question/{question_id}?custom=true', headers=other_headers).json()['total_practices'], 0)
        finally:
            with SessionLocal() as db:
                db.query(models.User).filter_by(id=other_id).delete(); db.commit()
