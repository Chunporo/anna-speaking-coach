import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi import HTTPException

from app.services import audio_storage as storage


class AudioStorageTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "recording.webm"
        self.path.write_bytes(b"validated recording fixture")
        self.enterContext(
            patch.multiple(
                storage.settings,
                AUDIO_STORAGE="supabase",
                SUPABASE_URL="https://storage.example.com",
                SUPABASE_AUDIO_BUCKET="recordings",
            )
        )

    def transport(self, handler):
        self.enterContext(
            patch.object(
                storage,
                "_client",
                side_effect=lambda: httpx.Client(
                    base_url="https://storage.example.com/storage/v1/",
                    transport=httpx.MockTransport(handler),
                ),
            )
        )

    def test_upload_requires_private_bucket_and_never_upserts(self):
        requests = []

        def handler(request):
            requests.append(request)
            if request.method == "GET":
                return httpx.Response(200, json={"public": False})
            self.assertEqual(request.headers["x-upsert"], "false")
            self.assertEqual(request.content, self.path.read_bytes())
            return httpx.Response(200, json={"Key": "recordings/recording.webm"})

        self.transport(handler)
        storage.persist_recording(self.path)
        self.assertEqual(
            [r.url.path for r in requests],
            [
                "/storage/v1/bucket/recordings",
                "/storage/v1/object/recordings/recording.webm",
            ],
        )

    def test_opaque_secret_key_is_not_sent_as_a_jwt(self):
        with patch.object(
            storage.settings, "SUPABASE_SERVICE_ROLE_KEY", "sb_secret_" + "test-only"
        ):
            with storage._client() as client:
                self.assertNotIn("Authorization", client.headers)
                self.assertIn("apikey", client.headers)
        with patch.object(
            storage.settings, "SUPABASE_SERVICE_ROLE_KEY", "legacy-test-key"
        ):
            with storage._client() as client:
                self.assertEqual(
                    client.headers["Authorization"], "Bearer legacy-test-key"
                )

    def test_public_bucket_rejected_before_upload(self):
        methods = []

        def handler(request):
            methods.append(request.method)
            return httpx.Response(200, json={"public": True})

        self.transport(handler)
        with self.assertRaises(HTTPException) as error:
            storage.persist_recording(self.path)
        self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(methods, ["GET"])

    def test_download_is_private_and_survives_local_file_removal(self):
        self.path.unlink()
        self.transport(lambda request: httpx.Response(200, content=b"remote audio"))
        response = storage.recording_response(self.path.name)
        self.assertEqual(response.body, b"remote audio")
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.assertEqual(response.media_type, "video/webm")

    def test_missing_recording_is_404(self):
        self.transport(lambda request: httpx.Response(404))
        with self.assertRaises(HTTPException) as error:
            storage.recording_response(self.path.name)
        self.assertEqual(error.exception.status_code, 404)

    def test_timeout_is_sanitized_and_retryable(self):
        def handler(request):
            raise httpx.ReadTimeout("credential must not be included", request=request)

        self.transport(handler)
        for operation in (
            lambda: storage.persist_recording(self.path),
            lambda: storage.recording_response(self.path.name),
            lambda: storage.delete_recording_file(self.path.name),
        ):
            with self.assertRaises(HTTPException) as error:
                operation()
            self.assertEqual(error.exception.status_code, 503)
            self.assertNotIn("credential", error.exception.detail)

    def test_unsafe_names_rejected_before_network_access(self):
        with patch.object(storage, "_client") as client:
            for name in ("../secret", "..", "folder/file", "folder\\file", ""):
                with self.assertRaises(HTTPException):
                    storage.recording_response(name)
                with self.assertRaises(HTTPException):
                    storage.delete_recording_file(name)
            client.assert_not_called()

    def test_delete_uses_storage_api_not_database_rows(self):
        def handler(request):
            self.assertEqual(request.method, "DELETE")
            self.assertEqual(request.url.path, "/storage/v1/object/recordings")
            self.assertEqual(request.read(), b'{"prefixes": ["recording.webm"]}')
            return httpx.Response(200, json=[])

        self.transport(handler)
        storage.delete_recording_file(self.path.name)
