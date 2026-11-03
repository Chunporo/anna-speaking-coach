"""Validate uploaded audio before storing or sending it to speech services."""
from pathlib import Path
import json
import subprocess
from fastapi import HTTPException, UploadFile

MAX_BYTES = 20 * 1024 * 1024
MAX_SECONDS = 300
EXTENSIONS = {'.webm', '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.mp4'}


def save_audio(audio: UploadFile, destination: Path) -> None:
    if destination.suffix.lower() not in EXTENSIONS:
        raise HTTPException(status_code=415, detail='Unsupported audio format')
    try:
        size = 0
        with destination.open('wb') as output:
            while chunk := audio.file.read(64 * 1024):
                size += len(chunk)
                if size > MAX_BYTES:
                    raise HTTPException(status_code=413, detail='Audio must be at most 20 MB')
                output.write(chunk)
        if not size:
            raise HTTPException(status_code=422, detail='Audio is empty')
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type',
             '-of', 'json', str(destination)], capture_output=True, text=True, timeout=15,
        )
        data = json.loads(result.stdout or '{}')
        if result.returncode or not any(s.get('codec_type') == 'audio' for s in data.get('streams', [])):
            raise HTTPException(status_code=422, detail='File is not valid audio')
        duration = data.get('format', {}).get('duration')
        # Browser WebM files can omit duration; decode them to enforce the limit.
        result = subprocess.run(
            ['ffmpeg', '-v', 'error', '-i', str(destination), '-t', str(MAX_SECONDS + 1),
             '-map', '0:a:0', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'],
            capture_output=True, timeout=30,
        )
        if result.returncode or not result.stdout:
            raise HTTPException(status_code=422, detail='Cannot decode audio')
        if len(result.stdout) > MAX_SECONDS * 8000 * 2 or (duration and float(duration) > MAX_SECONDS):
            raise HTTPException(status_code=413, detail='Audio must be at most 5 minutes')
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except (FileNotFoundError, subprocess.TimeoutExpired):
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail='Audio validation unavailable')
    except Exception:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail='Invalid audio')
