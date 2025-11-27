"""
Google Cloud Speech-to-Text service
"""
import os
from pathlib import Path
from typing import Optional
import logging

try:
    from google.cloud import speech
    GOOGLE_SPEECH_AVAILABLE = True
except ImportError:
    GOOGLE_SPEECH_AVAILABLE = False
    logging.warning("Google Cloud Speech library not installed. Install with: pip install google-cloud-speech")

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
            _speech_client = speech.SpeechClient()
        except Exception as e:
            logging.error(f"Failed to initialize Google Cloud Speech client: {e}")
            return None
    
    return _speech_client


def transcribe_audio_google(
    audio_path: Path,
    language_code: str = "en-US",
    sample_rate_hertz: Optional[int] = None,
    encoding: Optional[str] = None
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
        raise Exception("Google Cloud Speech library is not installed")
    
    client = get_speech_client()
    if client is None:
        raise Exception("Google Cloud Speech client is not available. Check your credentials.")
    
    try:
        # Read audio file
        audio_path = Path(audio_path).resolve()
        if not audio_path.exists():
            raise Exception(f"Audio file not found: {audio_path}")
        
        with open(audio_path, "rb") as audio_file:
            content = audio_file.read()
        
        # Auto-detect encoding and sample rate if not provided
        # Common formats: webm -> WEBM_OPUS, wav -> LINEAR16, mp3 -> MP3
        if encoding is None:
            file_ext = audio_path.suffix.lower()
            if file_ext == ".webm":
                encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
            elif file_ext == ".wav":
                encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
            elif file_ext == ".mp3":
                encoding = speech.RecognitionConfig.AudioEncoding.MP3
            elif file_ext == ".flac":
                encoding = speech.RecognitionConfig.AudioEncoding.FLAC
            else:
                # Default to LINEAR16, will try to auto-detect
                encoding = speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
        
        # Default sample rate for webm/opus is usually 48000, for wav it's often 16000
        if sample_rate_hertz is None:
            if encoding == speech.RecognitionConfig.AudioEncoding.WEBM_OPUS:
                sample_rate_hertz = 48000
            elif encoding == speech.RecognitionConfig.AudioEncoding.LINEAR16:
                sample_rate_hertz = 16000
            else:
                sample_rate_hertz = 16000  # Safe default
        
        # Configure recognition
        config = speech.RecognitionConfig(
            encoding=encoding,
            sample_rate_hertz=sample_rate_hertz,
            language_code=language_code,
            enable_automatic_punctuation=True,
            model="latest_long",  # Use latest long-form model for better accuracy
        )
        
        audio = speech.RecognitionAudio(content=content)
        
        # Perform transcription
        response = client.recognize(config=config, audio=audio)
        
        # Extract transcription from response
        if not response.results:
            raise Exception("No transcription results returned from Google Speech-to-Text")
        
        transcription = " ".join(
            result.alternatives[0].transcript
            for result in response.results
            if result.alternatives
        )
        
        if not transcription.strip():
            raise Exception("Empty transcription returned from Google Speech-to-Text")
        
        return transcription.strip()
        
    except Exception as e:
        error_msg = str(e)
        if "credentials" in error_msg.lower() or "authentication" in error_msg.lower():
            raise Exception(f"Google Cloud authentication error: {error_msg}. Please check your GOOGLE_APPLICATION_CREDENTIALS environment variable.")
        raise Exception(f"Google Cloud Speech-to-Text error: {error_msg}")


def transcribe_with_fallback(
    audio_path: Path,
    language_code: str = "en-US",
    use_google: bool = True
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
    from app.services import whisper_service
    import logging
    
    logger = logging.getLogger(__name__)
    transcription = None
    method = None
    error = None
    
    # Try Google Cloud Speech-to-Text first if requested and available
    if use_google and GOOGLE_SPEECH_AVAILABLE:
        try:
            logger.info("🎤 Attempting transcription with Google Cloud Speech-to-Text...")
            transcription = transcribe_audio_google(
                audio_path,
                language_code=language_code
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
                raise Exception(f"Both transcription methods failed. Google: {error}. Whisper: {whisper_error}")
            else:
                raise Exception(f"Whisper transcription failed: {whisper_error}")
    
    return transcription, method

