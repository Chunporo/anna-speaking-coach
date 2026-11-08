"""Storage failure boundaries that must never return unbounded or public media."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi import HTTPException

from app.services import audio_storage as storage


class StorageCoverageTests(unittest.TestCase):
    def test_local_lifecycle_and_missing_files(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.multiple(
                storage.settings, AUDIO_STORAGE="local", UPLOAD_DIR=Path(directory)
            ),
        ):
            path = Path(directory) / "answer.wav"
            path.write_bytes(b"audio")
            storage.persist_recording(path)
            self.assertEqual(storage.recording_response(path.name).path, path)
            storage.delete_recording_file(path.name)
            storage.delete_recording_file(path.name)
            with self.assertRaises(HTTPException) as error:
                storage.recording_response(path.name)
            self.assertEqual(error.exception.status_code, 404)

    def test_remote_failure_codes_metadata_and_download_bound(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.multiple(
                storage.settings,
                AUDIO_STORAGE="supabase",
                SUPABASE_AUDIO_BUCKET="private",
            ),
        ):
            path = Path(directory) / "answer.unknown"
            path.write_bytes(b"audio")

            def transport(handler):
                return patch.object(
                    storage,
                    "_client",
                    side_effect=lambda: httpx.Client(
                        base_url="https://example.com/storage/v1/",
                        transport=httpx.MockTransport(handler),
                    ),
                )

            for status, metadata in [(500, None), (200, []), (200, {"public": True})]:
                with (
                    self.subTest(status=status, metadata=metadata),
                    transport(lambda request: httpx.Response(status, json=metadata)),
                ):
                    with self.assertRaises(HTTPException) as error:
                        storage.persist_recording(path)
                    self.assertEqual(error.exception.status_code, 503)
            with transport(
                lambda request: httpx.Response(200, content=b"invalid json")
            ):
                with self.assertRaises(HTTPException):
                    storage.persist_recording(path)

            def upload_failed(request):
                return (
                    httpx.Response(200, json={"public": False})
                    if request.method == "GET"
                    else httpx.Response(503)
                )

            with transport(upload_failed):
                with self.assertRaises(HTTPException):
                    storage.persist_recording(path)
            for code in [400, 404, 500]:
                with (
                    self.subTest(code=code),
                    transport(lambda request: httpx.Response(code)),
                ):
                    with self.assertRaises(HTTPException) as error:
                        storage.recording_response(path.name)
                    self.assertEqual(
                        error.exception.status_code, 404 if code in [400, 404] else 503
                    )
                    if code == 500:
                        with self.assertRaises(HTTPException):
                            storage.delete_recording_file(path.name)
                    else:
                        if code == 404:
                            storage.delete_recording_file(path.name)
            with (
                transport(lambda request: httpx.Response(200, content=b"12345")),
                patch.object(storage, "MAX_BYTES", 4),
            ):
                with self.assertRaises(HTTPException) as error:
                    storage.recording_response(path.name)
                self.assertEqual(error.exception.status_code, 503)
            with transport(lambda request: httpx.Response(200, content=b"123")):
                self.assertEqual(
                    storage.recording_response(path.name).media_type,
                    "application/octet-stream",
                )
