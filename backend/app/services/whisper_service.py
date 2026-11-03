"""Optional local Whisper CLI, installed directly or in the whisper Mamba environment."""
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

MAMBA_ENV = os.getenv('WHISPER_ENV', 'whisper')
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'turbo')
WHISPER_LANGUAGE = 'en'

def transcribe_audio(audio_path: Path, output_dir: Optional[Path] = None) -> str:
    executable = shutil.which('whisper')
    command = [executable] if executable else [shutil.which('mamba') or 'mamba', 'run', '-n', MAMBA_ENV, 'whisper']
    with tempfile.TemporaryDirectory(prefix='anna-whisper-') as directory:
        subprocess.run(command + [str(audio_path.resolve()), '--model', WHISPER_MODEL,
                       '--output_format', 'json', '--output_dir', directory, '--language', WHISPER_LANGUAGE],
                       capture_output=True, check=True, timeout=300)
        text = json.loads((Path(directory) / (audio_path.stem + '.json')).read_text())['text'].strip()
        if not text:
            raise RuntimeError('No speech detected')
        return text

def transcribe_audio_simple(audio_path: Path) -> str:
    return transcribe_audio(audio_path)
