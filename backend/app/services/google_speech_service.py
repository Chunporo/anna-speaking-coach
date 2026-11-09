"""
Google Cloud Speech-to-Text service
"""

import logging
import os
from pathlib import Path
from typing import Optional

try:
    from google.cloud import speech

    GOOGLE_SPEECH_AVAILABLE = True
except ImportError:
    GOOGLE_SPEECH_AVAILABLE = False
    logging.warning(
        "Google Cloud Speech library not installed. Install with: pip install google-cloud-speech"
    )

# Initialize client (will be None if credentials not available)
_speech_client = None


def get_speech_client():
    """Get or create Google Cloud Speech client"""
    global _speech_client

    if not GOOGLE_SPEECH_AVAILABLE:
        return None

    if _speech_client is None:
        try:
            # Google Cloud client will automatically use credentials from:
            # 1. GOOGLE_APPLICATION_CREDENTIALS environment variable
            # 2. gcloud CLI default credentials
            # 3. Service account key file
            import json

            from google.oauth2 import service_account

            credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
            credentials = (
                service_account.Credentials.from_service_account_info(
                    json.loads(credentials_json)
                )
                if credentials_json
                else None
            )
            _speech_client = speech.SpeechClient(credentials=credentials)
        except Exception as e:
            logging.error(f"Failed to initialize Google Cloud Speech client: {e}")
            return None

    return _speech_client


def transcribe_audio_google(
    audio_path: Path,
    language_code: str = "en-US",
    sample_rate_hertz: Optional[int] = None,
    encoding: Optional[str] = None,
) -> str:
    """
    Transcribe audio file using Google Cloud Speech-to-Text API

    Args:
        audio_path: Path to the audio file
        language_code: BCP-47 language code (default: "en-US")
        sample_rate_hertz: Sample rate in Hz (auto-detected if None)
        encoding: Audio encoding (auto-detected if None)

    Returns:
        Transcribed text string

    Raises:
        Exception: If transcription fails or Google Cloud Speech is not available
    """
    if not GOOGLE_SPEECH_AVAILABLE:
        raise RuntimeError("Google Speech library is unavailable")
    client = get_speech_client()
    if client is None:
        raise RuntimeError("Google Speech credentials are unavailable")
    import subprocess
    import tempfile

    # Normalize browser formats and split into chunks below the synchronous API limit.
    with tempfile.TemporaryDirectory(prefix="anna-speech-") as directory:
        pattern = str(Path(directory) / "chunk-%03d.wav")
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                str(Path(audio_path).resolve()),
                "-map",
                "0:a:0",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-c:a",
                "pcm_s16le",
                "-f",
                "segment",
                "-segment_time",
                "55",
                pattern,
            ],
            check=True,
            capture_output=True,
            timeout=60,
        )
        transcripts = []
        for chunk in sorted(Path(directory).glob("chunk-*.wav")):
            response = client.recognize(
                config=speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                    sample_rate_hertz=16000,
                    language_code=language_code,
                    enable_automatic_punctuation=True,
                    model="latest_long",
                ),
                audio=speech.RecognitionAudio(content=chunk.read_bytes()),
                timeout=60,
            )
            transcripts.extend(
                result.alternatives[0].transcript
                for result in response.results
                if result.alternatives
            )
        transcription = " ".join(transcripts).strip()
        if not transcription:
            raise RuntimeError("No speech detected")
        return transcription


def transcribe_with_fallback(
    audio_path: Path, language_code: str = "en-US", use_google: bool = True
) -> tuple[str, str]:
    """
    Transcribe audio with Google Cloud Speech-to-Text fallback to Whisper

    This is a convenience function that tries Google Cloud Speech-to-Text first,
    then falls back to Whisper if Google fails or is not available.

    Args:
        audio_path: Path to the audio file
        language_code: BCP-47 language code (default: "en-US")
        use_google: Whether to try Google Cloud Speech-to-Text first (default: True)

    Returns:
        tuple: (transcription, method) where method is "google" or "whisper"

    Raises:
        Exception: If both transcription methods fail
    """
    import logging

    from app.services import whisper_service

    logger = logging.getLogger(__name__)
    transcription = None
    method = None
    error = None

    # Try Google Cloud Speech-to-Text first if requested and available
    if use_google and GOOGLE_SPEECH_AVAILABLE:
        try:
            logger.info(
                "🎤 Attempting transcription with Google Cloud Speech-to-Text..."
            )
            transcription = transcribe_audio_google(
                audio_path, language_code=language_code
            )
            method = "google"
            logger.info("✅ Google Cloud Speech-to-Text succeeded")
        except Exception as e:
            error = str(e)
            logger.warning(f"❌ Google Cloud Speech-to-Text failed: {error}")
            logger.info("🔄 Falling back to Whisper...")

    # Fallback to Whisper if Google failed or not requested
    if not transcription:
        try:
            logger.info("🎤 Attempting transcription with Whisper (local)...")
            transcription = whisper_service.transcribe_audio(audio_path)
            if not transcription or not transcription.strip():
                raise Exception("Whisper returned empty transcription")
            method = "whisper"
            logger.info("✅ Whisper transcription succeeded")
        except Exception as e:
            whisper_error = str(e)
            logger.error(f"❌ Whisper transcription failed: {whisper_error}")

            # If both failed, raise error
            if error:
                raise Exception(
                    f"Both transcription methods failed. Google: {error}. Whisper: {whisper_error}"
                )
            else:
                raise Exception(f"Whisper transcription failed: {whisper_error}")

    return transcription, method
