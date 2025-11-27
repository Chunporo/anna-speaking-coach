"""
Text-to-Speech service using ParlerTTS in mamba environment
"""
import subprocess
import os
import hashlib
from pathlib import Path
from typing import Optional

# Path to mamba/conda environment activation
MAMBA_ENV = "whisper"  # Using the same mamba environment as Whisper

# Get absolute path to uploads directory (relative to backend directory)
# This file is in backend/app/services/, so go up 2 levels to backend/
BACKEND_DIR = Path(__file__).parent.parent.parent.resolve()
TTS_OUTPUT_DIR = BACKEND_DIR / "uploads" / "tts"
TTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Voice description for ParlerTTS
VOICE_DESCRIPTION = "A clear, professional English voice with neutral accent, suitable for IELTS speaking practice questions."


def generate_tts_audio(text: str, output_filename: Optional[str] = None) -> Path:
    """
    Generate TTS audio file using ParlerTTS in mamba environment
    
    Args:
        text: Text to convert to speech
        output_filename: Optional custom filename (without extension)
        
    Returns:
        Path to the generated audio file
    """
    try:
        # Generate filename from text hash if not provided
        if output_filename is None:
            text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
            output_filename = f"tts_{text_hash}"
        
        output_path = TTS_OUTPUT_DIR / f"{output_filename}.wav"
        
        # Check if file already exists (caching)
        if output_path.exists():
            return output_path
        
        # Get mamba base path
        try:
            mamba_base_result = subprocess.run(
                ["mamba", "info", "--base"],
                capture_output=True,
                text=True,
                check=True,
                timeout=10
            )
            output = mamba_base_result.stdout.strip()
            if ":" in output:
                mamba_base = output.split(":")[-1].strip()
            else:
                mamba_base = output
            mamba_base = mamba_base.strip()
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
            raise Exception(f"Failed to get mamba base path. Make sure mamba is installed and in PATH: {e}")
        
        if not mamba_base or not os.path.exists(mamba_base):
            raise Exception(f"Invalid mamba base path: {mamba_base}")
        
        # Build the command to run ParlerTTS
        mamba_script = os.path.join(mamba_base, "etc", "profile.d", "mamba.sh")
        output_path_str = str(output_path.resolve())
        
        # Use repr() for proper Python string escaping
        text_repr = repr(text)
        description_repr = repr(VOICE_DESCRIPTION)
        output_path_repr = repr(output_path_str)
        
        # Create Python script to run TTS
        python_script = f"""import torch
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer
import soundfile as sf

device = "cuda:0" if torch.cuda.is_available() else "cpu"

model = ParlerTTSForConditionalGeneration.from_pretrained("parler-tts/parler-tts-mini-v1").to(device)
tokenizer = AutoTokenizer.from_pretrained("parler-tts/parler-tts-mini-v1")

prompt = {text_repr}
description = {description_repr}

input_ids = tokenizer(description, return_tensors="pt").input_ids.to(device)
prompt_input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(device)

generation = model.generate(input_ids=input_ids, prompt_input_ids=prompt_input_ids)
audio_arr = generation.cpu().numpy().squeeze()
sf.write({output_path_repr}, audio_arr, model.config.sampling_rate)
"""
        
        # Write Python script to temporary file
        script_path = TTS_OUTPUT_DIR / "temp_tts_script.py"
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(python_script)
        
        script_path_str = str(script_path.resolve()).replace("'", "'\"'\"'")
        
        # Run the script in mamba environment
        tts_cmd = f"""bash -c "source '{mamba_script}' && mamba activate {MAMBA_ENV} && python '{script_path_str}'" """
        
        result = subprocess.run(
            tts_cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=False,
            timeout=120  # 2 minute timeout
        )
        
        # Clean up temporary script
        if script_path.exists():
            script_path.unlink()
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            raise Exception(f"TTS generation failed: {error_msg}")
        
        if not output_path.exists():
            raise Exception(f"TTS output file not found: {output_path}")
        
        return output_path
        
    except subprocess.TimeoutExpired:
        raise Exception("TTS generation timed out (exceeded 2 minutes)")
    except Exception as e:
        # Re-raise if it's already an Exception with our message
        if "Failed to get mamba base path" in str(e) or "Invalid mamba base path" in str(e):
            raise
        raise Exception(f"TTS error: {str(e)}")


def get_tts_audio_url(text: str, question_id: Optional[int] = None) -> str:
    """
    Get or generate TTS audio URL for a question text
    
    Args:
        text: Question text
        question_id: Optional question ID for filename
        
    Returns:
        URL path to the audio file
    """
    if question_id:
        output_filename = f"question_{question_id}"
    else:
        output_filename = None
    
    audio_path = generate_tts_audio(text, output_filename)
    
    # Return relative path from uploads directory
    # The file is in backend/uploads/tts/, so the URL should be /uploads/tts/filename.wav
    uploads_dir = BACKEND_DIR / "uploads"
    relative_path = audio_path.relative_to(uploads_dir)
    return f"/uploads/{relative_path.as_posix()}"

