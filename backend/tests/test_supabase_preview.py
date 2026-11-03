import unittest
from unittest.mock import MagicMock, patch

from sqlalchemy.engine import URL, make_url
import start_supabase_preview as preview


class SupabasePreviewTests(unittest.TestCase):
    project_ref = 'a' * 20

    def uri(self, **changes):
        values = dict(drivername='postgresql', username='postgres.' + self.project_ref,
            password='[YOUR-PASSWORD]', host='aws-1-ap-southeast-1.pooler.supabase.com',
            port=5432, database='postgres')
        values.update(changes)
        return URL.create(**values).render_as_string(hide_password=False)

    def test_password_is_encoded_and_tls_required(self):
        password = 'fixture@:/?#%'
        result = make_url(preview.database_url(self.uri(), password, self.project_ref))
        self.assertEqual(result.password, password)
        self.assertEqual(result.query['sslmode'], 'require')
        self.assertEqual(result.query['connect_timeout'], '10')

    def test_existing_encoded_password_is_preserved(self):
        result = make_url(preview.database_url(self.uri(password='fixture@value'), '', self.project_ref))
        self.assertEqual(result.password, 'fixture@value')

    def test_rejects_other_projects_transaction_poolers_and_missing_passwords(self):
        for uri, password in (
            (self.uri(username='postgres.' + 'b' * 20), 'fixture'),
            (self.uri(port=6543), 'fixture'),
            (self.uri(host='other.example.com'), 'fixture'),
            (self.uri(), ''),
            ('not a connection string', 'fixture'),
        ):
            with self.assertRaises(preview.SetupError):
                preview.database_url(uri, password, self.project_ref)

    def test_connection_errors_do_not_echo_credentials(self):
        engine = MagicMock()
        engine.connect.side_effect = RuntimeError('credential-bearing diagnostic')
        with patch.object(preview, 'create_engine', return_value=engine):
            with self.assertRaises(preview.SetupError) as error:
                preview.check_database('not displayed')
        self.assertNotIn('credential-bearing', str(error.exception))
        engine.dispose.assert_called_once()

    def test_private_bucket_probe_uploads_downloads_and_deletes(self):
        from app.services import audio_storage
        client = MagicMock()
        client.get.return_value.status_code = 200
        client.get.return_value.is_success = True
        client.get.return_value.json.return_value = {'public': False}
        def upload(path):
            self.assertTrue(path.is_file())
        def download(filename):
            # The fixture is generated in the helper, so use a matching WAV.
            import io, wave
            data = io.BytesIO()
            with wave.open(data, 'wb') as audio:
                audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(16000)
                audio.writeframes(b'\0\0' * 160)
            return MagicMock(body=data.getvalue())
        with patch.object(audio_storage, '_client') as factory, patch.object(audio_storage, 'persist_recording', side_effect=upload) as persist, patch.object(audio_storage, 'recording_response', side_effect=download), patch.object(audio_storage, 'delete_recording_file') as delete:
            factory.return_value.__enter__.return_value = client
            preview.check_storage()
        persist.assert_called_once()
        delete.assert_called_once_with(persist.call_args.args[0].name)
        self.assertFalse(persist.call_args.args[0].exists())

    def test_public_bucket_is_rejected_before_upload(self):
        from app.services import audio_storage
        client = MagicMock()
        client.get.return_value.status_code = 200
        client.get.return_value.is_success = True
        client.get.return_value.json.return_value = {'public': True}
        with patch.object(audio_storage, '_client') as factory, patch.object(audio_storage, 'persist_recording') as persist:
            factory.return_value.__enter__.return_value = client
            with self.assertRaises(preview.SetupError):
                preview.check_storage()
            persist.assert_not_called()
