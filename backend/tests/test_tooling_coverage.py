"""Offline boundaries for provider adapters and maintenance commands."""
import asyncio
import io
import subprocess
import tempfile
import unittest
from contextlib import ExitStack, redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from starlette.requests import Request
from app.core.config import Settings
from app.services import audio_storage, google_speech_service as speech, tts_service as tts
import start_supabase_preview as preview


class SettingsValidationTests(unittest.TestCase):
    def settings(self, **values):
        defaults = dict(AUDIO_STORAGE='local', ENVIRONMENT='development', CORS_ALLOW_ALL=True)
        with patch.multiple(Settings, **{**defaults, **values}):
            return Settings()

    def test_storage_configuration_requires_private_https_origin_and_server_key(self):
        with self.assertRaisesRegex(ValueError, 'AUDIO_STORAGE'):
            self.settings(AUDIO_STORAGE='other')
        for origin in ['http://example.com', 'https://user@example.com', 'https://example.com/path', 'https://example.com?q=1', 'https://example.com#x', 'https://']:
            with self.subTest(origin=origin), self.assertRaisesRegex(ValueError, 'HTTPS'):
                self.settings(AUDIO_STORAGE='supabase', SUPABASE_URL=origin)
        for key, bucket in [('', 'recordings'), ('fixture', '')]:
            with self.assertRaisesRegex(ValueError, 'server key'):
                self.settings(AUDIO_STORAGE='supabase', SUPABASE_URL='https://example.com', SUPABASE_SERVICE_ROLE_KEY=key, SUPABASE_AUDIO_BUCKET=bucket)
        self.settings(AUDIO_STORAGE='supabase', SUPABASE_URL='https://example.com/', SUPABASE_SERVICE_ROLE_KEY='fixture', SUPABASE_AUDIO_BUCKET='recordings')

    def test_production_rejects_weak_signing_keys_and_wildcard_origins(self):
        for key in ['short', 'your-' + 'a' * 40, 'change-' + 'b' * 40]:
            with self.assertRaisesRegex(ValueError, 'SECRET_KEY'):
                self.settings(ENVIRONMENT='production', SECRET_KEY=key)
        for origins in ['', '*']:
            with self.assertRaisesRegex(ValueError, 'ALLOWED_ORIGINS'):
                self.settings(ENVIRONMENT='production', SECRET_KEY='fixture' * 8, ALLOWED_ORIGINS_STR=origins)
        with patch.multiple(Settings, AUDIO_STORAGE='local', ENVIRONMENT='production', SECRET_KEY='fixture' * 8, ALLOWED_ORIGINS_STR=' https://example.com, ,https://other.example.com '):
            configured = Settings()
            self.assertEqual(configured.allowed_origins, ['https://example.com', 'https://other.example.com'])
            self.assertTrue(configured.allow_credentials)
            self.assertFalse(configured.is_development)
        with patch.multiple(Settings, AUDIO_STORAGE='local', ENVIRONMENT='development', CORS_ALLOW_ALL=True):
            self.assertEqual(Settings().allowed_origins, ['*'])
            self.assertFalse(Settings().allow_credentials)


class TtsBoundaryTests(unittest.TestCase):
    def test_cached_audio_and_question_urls_are_stable(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(tts, 'TTS_OUTPUT_DIR', Path(directory)), patch.object(tts.subprocess, 'run') as run:
            cached = Path(directory) / 'custom.wav'
            cached.write_bytes(b'wave')
            self.assertEqual(tts.generate_tts_audio('question', 'custom'), cached)
            run.assert_not_called()
        with patch.object(tts, 'generate_tts_audio', return_value=tts.BACKEND_DIR / 'uploads/tts/generated.wav') as generate:
            self.assertEqual(tts.get_tts_audio_url('Why?', 12), '/uploads/tts/generated.wav')
            self.assertTrue(generate.call_args.args[1].startswith('question_12_'))
            tts.get_tts_audio_url('Why?')
            self.assertIsNone(generate.call_args.args[1])

    def test_generation_creates_audio_and_removes_temporary_script(self):
        for base_prefix in ['', 'base environment : ']:
            with self.subTest(base_prefix=base_prefix), tempfile.TemporaryDirectory() as directory, patch.object(tts, 'TTS_OUTPUT_DIR', Path(directory)):
                scripts = []
                def run(command, **kwargs):
                    if command[:2] == ['mamba', 'info']:
                        return SimpleNamespace(stdout=base_prefix + directory)
                    script = Path(command[-1])
                    scripts.append(script)
                    self.assertIn(repr("What's your hobby?"), script.read_text())
                    (Path(directory) / 'question.wav').write_bytes(b'wave')
                    return SimpleNamespace(returncode=0)
                with patch.object(tts.subprocess, 'run', side_effect=run):
                    self.assertEqual(tts.generate_tts_audio("What's your hobby?", 'question').read_bytes(), b'wave')
                self.assertFalse(scripts[0].exists())

    def test_generation_errors_remain_actionable_and_remove_scripts(self):
        for failure in [FileNotFoundError(), subprocess.CalledProcessError(1, 'mamba'), subprocess.TimeoutExpired('mamba', 10)]:
            with patch.object(tts.subprocess, 'run', side_effect=failure), self.assertRaisesRegex(Exception, 'Failed to get mamba base path'):
                tts.generate_tts_audio('fixture missing base')
        with patch.object(tts.subprocess, 'run', return_value=SimpleNamespace(stdout='')), self.assertRaisesRegex(Exception, 'Invalid mamba base path'):
            tts.generate_tts_audio('fixture invalid base')
        for result, message in [(SimpleNamespace(returncode=1, stderr='provider failed', stdout=''), 'provider failed'), (SimpleNamespace(returncode=1, stderr='', stdout='stdout failure'), 'stdout failure'), (SimpleNamespace(returncode=0), 'output file not found'), (subprocess.TimeoutExpired('tts', 120), 'timed out')]:
            with self.subTest(message=message), tempfile.TemporaryDirectory() as directory, patch.object(tts, 'TTS_OUTPUT_DIR', Path(directory)):
                scripts = []
                def run(command, **kwargs):
                    if command[:2] == ['mamba', 'info']:
                        return SimpleNamespace(stdout=directory)
                    scripts.append(Path(command[-1]))
                    if isinstance(result, Exception):
                        raise result
                    return result
                with patch.object(tts.subprocess, 'run', side_effect=run), self.assertRaisesRegex(Exception, message):
                    tts.generate_tts_audio('fixture')
                self.assertFalse(scripts[0].exists())


class GoogleSpeechBoundaryTests(unittest.TestCase):
    def test_client_is_cached_and_initialization_failures_return_none(self):
        from google.oauth2 import service_account
        fake_speech = MagicMock()
        with patch.object(speech, 'GOOGLE_SPEECH_AVAILABLE', True), patch.object(speech, '_speech_client', None), patch.object(speech, 'speech', fake_speech, create=True), patch.object(speech.os, 'getenv', return_value=None):
            self.assertIs(speech.get_speech_client(), fake_speech.SpeechClient.return_value)
            self.assertIs(speech.get_speech_client(), fake_speech.SpeechClient.return_value)
            fake_speech.SpeechClient.assert_called_once_with(credentials=None)
        with patch.object(speech, 'GOOGLE_SPEECH_AVAILABLE', True), patch.object(speech, '_speech_client', None), patch.object(speech, 'speech', fake_speech, create=True), patch.object(speech.os, 'getenv', return_value='{}'), patch.object(service_account.Credentials, 'from_service_account_info', return_value='fixture-credentials'):
            speech.get_speech_client()
            fake_speech.SpeechClient.assert_called_with(credentials='fixture-credentials')
        with patch.object(speech, 'GOOGLE_SPEECH_AVAILABLE', True), patch.object(speech, '_speech_client', None), patch.object(speech.os, 'getenv', return_value='invalid-json'):
            self.assertIsNone(speech.get_speech_client())

    def test_transcription_orders_chunks_and_ignores_results_without_alternatives(self):
        client = MagicMock()
        client.recognize.side_effect = [SimpleNamespace(results=[SimpleNamespace(alternatives=[]), SimpleNamespace(alternatives=[SimpleNamespace(transcript='First')])]), SimpleNamespace(results=[SimpleNamespace(alternatives=[SimpleNamespace(transcript='second')])])]
        def convert(command, **kwargs):
            for number in [1, 0]:
                Path(command[-1].replace('%03d', f'{number:03}')).write_bytes(b'wave')
        with patch.object(speech, 'GOOGLE_SPEECH_AVAILABLE', True), patch.object(speech, 'get_speech_client', return_value=client), patch('subprocess.run', side_effect=convert):
            self.assertEqual(speech.transcribe_audio_google(Path('/tmp/fixture.wav'), language_code='vi-VN'), 'First second')
            self.assertEqual(client.recognize.call_args.kwargs['config'].language_code, 'vi-VN')
            client.recognize.side_effect = None
            client.recognize.return_value = SimpleNamespace(results=[])
            with self.assertRaisesRegex(RuntimeError, 'No speech detected'):
                speech.transcribe_audio_google(Path('/tmp/fixture.wav'))


class PreviewToolingTests(unittest.TestCase):
    def test_configuration_validation_never_modifies_real_environment(self):
        import dotenv
        values = {}
        with patch.object(preview, 'os', SimpleNamespace(environ=values)), patch.object(dotenv, 'load_dotenv'), patch.object(preview.secrets, 'token_hex', return_value='fixture-signing-key'):
            for ref, key, origin in [('invalid', 'fixture', 'https://example.com'), ('a'*20, '', 'https://example.com'), ('a'*20, 'sb_publishable_fixture', 'https://example.com'), ('a'*20, 'fixture', 'http://example.com'), ('a'*20, 'fixture', 'https://example.com/path')]:
                with self.assertRaises(preview.SetupError):
                    preview.configure_environment(ref, 'fixture-uri', key, origin)
                self.assertEqual(values, {})
            preview.configure_environment('a'*20, 'fixture-uri', 'fixture', 'https://example.com')
            self.assertEqual(values['AUDIO_STORAGE'], 'supabase')
            self.assertEqual(values['ALLOWED_ORIGINS'], 'https://example.com')
            self.assertEqual(values['SECRET_KEY'], 'fixture-signing-key')
            self.assertFalse(dotenv.load_dotenv())

    def test_database_probe_closes_engine(self):
        engine = MagicMock()
        with patch.object(preview, 'create_engine', return_value=engine):
            preview.check_database('fixture-uri')
        engine.dispose.assert_called_once()
        self.assertEqual(str(engine.connect.return_value.__enter__.return_value.execute.call_args.args[0]), 'SELECT 1')

    def test_storage_creation_failures_and_download_mismatch_delete_uploaded_object(self):
        for label in ['create-failed', 'metadata-invalid', 'mismatch', 'unexpected']:
            with self.subTest(label=label), ExitStack() as stack:
                client = MagicMock()
                client.get.side_effect = [SimpleNamespace(status_code=404), SimpleNamespace(is_success=True, json=lambda: {} if label == 'metadata-invalid' else {'public': False})]
                client.post.return_value.is_success = label != 'create-failed'
                factory = stack.enter_context(patch.object(audio_storage, '_client'))
                factory.return_value.__enter__.return_value = client
                persist = stack.enter_context(patch.object(audio_storage, 'persist_recording'))
                stack.enter_context(patch.object(audio_storage, 'recording_response', return_value=SimpleNamespace(body=b'mismatch')))
                delete = stack.enter_context(patch.object(audio_storage, 'delete_recording_file'))
                if label == 'unexpected':
                    persist.side_effect = RuntimeError('sensitive diagnostic')
                with self.assertRaises(preview.SetupError) as error:
                    preview.check_storage()
                self.assertNotIn('sensitive diagnostic', str(error.exception))
                if label == 'mismatch':
                    delete.assert_called_once()

    def test_main_preconditions_and_mocked_startup(self):
        for port, busy, interactive, message in [(80, False, True, 'local port'), (8014, True, True, 'already in use'), (8014, False, False, 'interactive terminal')]:
            with patch.object(preview.sys, 'argv', ['preview', '--project-ref', 'a'*20, '--port', str(port)]), patch.object(preview.socket, 'socket') as sock, patch.object(preview.sys.stdin, 'isatty', return_value=interactive), self.assertRaisesRegex(preview.SetupError, message):
                if busy:
                    sock.return_value.__enter__.return_value.bind.side_effect = OSError('busy')
                preview.main()
        from database import init_db
        for fail in [True, False]:
            with self.subTest(fail=fail), ExitStack() as stack:
                stack.enter_context(patch.object(preview.sys, 'argv', ['preview', '--project-ref', 'a'*20]))
                stack.enter_context(patch.object(preview.socket, 'socket'))
                stack.enter_context(patch.object(preview.sys.stdin, 'isatty', return_value=True))
                stack.enter_context(patch.object(preview.getpass, 'getpass', side_effect=['uri', '', 'fixture']))
                stack.enter_context(patch.object(preview, 'database_url', return_value='fixture-uri'))
                stack.enter_context(patch.object(preview, 'configure_environment'))
                stack.enter_context(patch.object(preview, 'check_database'))
                stack.enter_context(patch.object(preview, 'check_storage'))
                initialize = stack.enter_context(patch.object(init_db, 'init_database', side_effect=RuntimeError('private') if fail else None))
                stack.enter_context(patch.object(preview.os, 'chdir'))
                run = stack.enter_context(patch('uvicorn.run'))
                stack.enter_context(redirect_stdout(io.StringIO()))
                if fail:
                    with self.assertRaisesRegex(preview.SetupError, 'initialization failed'):
                        preview.main()
                    run.assert_not_called()
                else:
                    preview.main()
                    self.assertEqual(run.call_args.kwargs, dict(host='127.0.0.1', port=8014))
                initialize.assert_called_once_with(seed_if_empty=True)


class MaintenanceBoundaryTests(unittest.TestCase):
    def test_cleanup_dry_run_and_apply_only_remove_audio(self):
        from database import cleanup_audio
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / 'old.wav').write_bytes(b'wave')
            for storage, apply in [('local', False), ('local', True), ('supabase', True)]:
                with self.subTest(storage=storage, apply=apply), ExitStack() as stack:
                    stack.enter_context(patch.object(cleanup_audio.sys, 'argv', ['cleanup', '--days', '30'] + (['--apply'] if apply else [])))
                    factory = stack.enter_context(patch.object(cleanup_audio, 'SessionLocal'))
                    db = factory.return_value.__enter__.return_value
                    db.query.return_value.filter.return_value.all.return_value = [SimpleNamespace(audio_url='/api/audio/old.wav'), SimpleNamespace(audio_url='/api/audio/missing.wav'), SimpleNamespace(audio_url='/api/audio/old.wav')]
                    stack.enter_context(patch.object(cleanup_audio.settings, 'AUDIO_STORAGE', storage))
                    stack.enter_context(patch.object(cleanup_audio.settings, 'UPLOAD_DIR', Path(directory)))
                    delete = stack.enter_context(patch.object(cleanup_audio, 'delete_recording_file'))
                    output = stack.enter_context(redirect_stdout(io.StringIO()))
                    cleanup_audio.main()
                    self.assertIn(f'{2 if storage == "supabase" else 1} recordings eligible', output.getvalue())
                    self.assertEqual(delete.call_count, (2 if storage == 'supabase' else 1) if apply else 0)
                    db.delete.assert_not_called()
                    db.commit.assert_not_called()
        with patch.object(cleanup_audio.sys, 'argv', ['cleanup', '--days', '0']), patch.object(cleanup_audio, 'SessionLocal') as factory, self.assertRaises(SystemExit):
            cleanup_audio.main()
        factory.assert_not_called()

    def test_health_reports_database_outage_and_cors_diagnostics(self):
        from app import database, main
        with patch.object(database, 'SessionLocal') as factory:
            self.assertEqual(main.health(), {'status': 'healthy'})
            factory.return_value.__enter__.side_effect = RuntimeError('offline')
            with self.assertRaises(HTTPException) as error:
                main.health()
            self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(asyncio.run(main.root()), {'message': 'IELTS Speaking Practice API'})
        response = asyncio.run(main.cors_test(Request({'type': 'http', 'headers': [(b'origin', b'https://example.com')]})))
        self.assertEqual(response['origin'], 'https://example.com')
