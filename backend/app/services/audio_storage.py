"""Private durable recording storage; local files remain the development default."""

import mimetypes
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import HTTPException
from fastapi.responses import FileResponse, Response

from app.core.config import settings
from app.utils.uploads import MAX_BYTES


def _name(filename: str) -> str:
    if (
        not filename
        or filename in {".", ".."}
        or Path(filename).name != filename
        or "\\" in filename
    ):
        raise HTTPException(status_code=404, detail="Recording not found")
    return quote(filename, safe="")


def _client():
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {"apikey": key}
    # New opaque secret keys belong only in apikey; legacy service-role JWTs
    # also use the bearer header expected by older Supabase deployments.
    if not key.startswith("sb_secret_"):
        headers["Authorization"] = "Bearer " + key
    return httpx.Client(
        base_url=settings.SUPABASE_URL + "/storage/v1/",
        headers=headers,
        timeout=httpx.Timeout(60, connect=10),
        follow_redirects=False,
    )


def _bucket() -> str:
    return quote(settings.SUPABASE_AUDIO_BUCKET, safe="")


def _unavailable():
    return HTTPException(
        status_code=503, detail="Recording storage unavailable; please try again"
    )


def persist_recording(path: Path) -> None:
    """Upload before committing history. The caller owns temporary-file cleanup."""
    name = _name(path.name)
    if settings.AUDIO_STORAGE == "local":
        return
    try:
        with _client() as client:
            bucket = client.get("bucket/" + _bucket())
            metadata = bucket.json() if bucket.status_code == 200 else None
            if not isinstance(metadata, dict) or metadata.get("public") is not False:
                raise _unavailable()
            with path.open("rb") as audio:
                result = client.post(
                    f"object/{_bucket()}/{name}",
                    content=audio,
                    headers={
                        "Content-Type": mimetypes.guess_type(path.name)[0]
                        or "application/octet-stream",
                        "x-upsert": "false",
                    },
                )
            if not result.is_success:
                raise _unavailable()
    except (httpx.HTTPError, ValueError, OSError):
        raise _unavailable() from None


def recording_response(filename: str):
    """Called only after the API verifies the authenticated user's ownership."""
    name = _name(filename)
    headers = {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if settings.AUDIO_STORAGE == "local":
        path = settings.UPLOAD_DIR / filename
        if not path.is_file():
            raise HTTPException(status_code=404, detail="Recording not found")
        return FileResponse(path, headers=headers)
    try:
        with _client() as client:
            with client.stream(
                "GET", f"object/authenticated/{_bucket()}/{name}"
            ) as result:
                if result.status_code in {400, 404}:
                    raise HTTPException(status_code=404, detail="Recording not found")
                if not result.is_success:
                    raise _unavailable()
                data = bytearray()
                for chunk in result.iter_bytes():
                    data.extend(chunk)
                    if len(data) > MAX_BYTES:
                        raise _unavailable()
        return Response(
            bytes(data),
            media_type=mimetypes.guess_type(filename)[0] or "application/octet-stream",
            headers=headers,
        )
    except httpx.HTTPError:
        raise _unavailable() from None


def delete_recording_file(filename: str) -> None:
    _name(filename)
    if settings.AUDIO_STORAGE == "local":
        (settings.UPLOAD_DIR / filename).unlink(missing_ok=True)
        return
    try:
        with _client() as client:
            result = client.request(
                "DELETE", "object/" + _bucket(), json={"prefixes": [filename]}
            )
            if not result.is_success and result.status_code != 404:
                raise _unavailable()
    except httpx.HTTPError:
        raise _unavailable() from None
