"""
Whisper transcription service using mamba environment
"""
import subprocess
import json
import os
from pathlib import Path
from typing import Optional

# Path to mamba/conda environment activation
MAMBA_ENV = "whisper"
WHISPER_MODEL = "turbo"
WHISPER_LANGUAGE = "en"


def transcribe_audio(audio_path: Path, output_dir: Optional[Path] = None) -> str:
    """
    Transcribe audio file using Whisper in mamba environment
    
    Args:
        audio_path: Path to the audio file
        output_dir: Optional directory for output files
        
    Returns:
        Transcribed text string
    """
    try:
        # Use absolute path
        audio_path = audio_path.resolve()
        
        # Set output directory (default to same directory as audio)
        if output_dir is None:
            output_dir = audio_path.parent
        else:
            output_dir = Path(output_dir).resolve()
            output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get mamba base path first
        try:
            mamba_base_result = subprocess.run(
                ["mamba", "info", "--base"],
                capture_output=True,
                text=True,
                check=True,
                timeout=10
            )
            # Extract path from output (might include extra text like "base environment : /path")
            output = mamba_base_result.stdout.strip()
            # If output contains ":", extract the path after the last colon and space
            if ":" in output:
                mamba_base = output.split(":")[-1].strip()
            else:
                mamba_base = output
            
            # Remove any trailing whitespace or newlines
            mamba_base = mamba_base.strip()
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
            raise Exception(f"Failed to get mamba base path. Make sure mamba is installed and in PATH: {e}")
        
        if not mamba_base or not os.path.exists(mamba_base):
            raise Exception(f"Invalid mamba base path: {mamba_base}")
        
        # Build Whisper command similar to whisper_note.md
        # Using bash to activate mamba environment and run whisper
        # Escape paths properly for shell command
        audio_path_str = str(audio_path).replace("'", "'\"'\"'")
        output_dir_str = str(output_dir).replace("'", "'\"'\"'")
        
        # Build the command with proper mamba base path
        mamba_script = os.path.join(mamba_base, "etc", "profile.d", "mamba.sh")
        whisper_cmd = f"""bash -c "source '{mamba_script}' && mamba activate {MAMBA_ENV} && whisper '{audio_path_str}' --model {WHISPER_MODEL} --output_format json --output_dir '{output_dir_str}' --language {WHISPER_LANGUAGE}" """
        
        # Run Whisper transcription
        result = subprocess.run(
            whisper_cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=False,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            raise Exception(f"Whisper transcription failed: {error_msg}")
        
        # Read the JSON output file
        json_output_path = output_dir / f"{audio_path.stem}.json"
        
        if not json_output_path.exists():
            raise Exception(f"Whisper output file not found: {json_output_path}")
        
        with open(json_output_path, 'r', encoding='utf-8') as f:
            whisper_result = json.load(f)
        
        # Extract text from Whisper output
        transcription = whisper_result.get('text', '').strip()
        
        # Clean up JSON file (optional - you might want to keep it for debugging)
        # os.remove(json_output_path)
        
        return transcription
        
    except subprocess.TimeoutExpired:
        raise Exception("Whisper transcription timed out (exceeded 5 minutes)")
    except Exception as e:
        # Re-raise if it's already an Exception with our message
        if "Failed to get mamba base path" in str(e) or "Invalid mamba base path" in str(e):
            raise
        raise Exception(f"Transcription error: {str(e)}")


def transcribe_audio_simple(audio_path: Path) -> str:
    """
    Simplified transcription function using mamba environment
    Uses the same approach as transcribe_audio but with simpler error handling
    """
    return transcribe_audio(audio_path)

