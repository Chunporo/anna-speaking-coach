# Whisper Transcription Integration

## Overview
Whisper transcription has been integrated into the audio analysis pipeline. When users submit audio recordings for analysis, the system now uses Whisper to generate real transcriptions instead of placeholders.

## Setup Requirements

1. **Mamba Environment**: Ensure you have a mamba environment named "whisper" with Whisper installed
   ```bash
   mamba activate whisper
   whisper --version  # Should show whisper is available
   ```

2. **Whisper Model**: The system uses the "turbo" model by default (configurable in `backend/app/services/whisper_service.py`)

## How It Works

1. User records audio and submits for analysis via "Gửi để phân tích" button
2. Audio file is saved to `uploads/audio/` directory
3. Whisper service is called to transcribe the audio:
   - Activates mamba environment: `mamba activate whisper`
   - Runs: `whisper [audio_file] --model turbo --output_format json --output_dir [dir] --language en`
   - Extracts transcription from the JSON output
4. Transcription is stored in the database along with scores

## Configuration

Edit `backend/app/services/whisper_service.py` to customize:
- `MAMBA_ENV`: Name of your mamba environment (default: "whisper")
- `WHISPER_MODEL`: Whisper model to use (default: "turbo")
- `WHISPER_LANGUAGE`: Language code (default: "en")

## Error Handling

If Whisper transcription fails, the system will:
- Log the error
- Store an error message in the transcription field
- Continue with analysis using placeholder scores (still allows the practice session to be created)

## Testing

To test Whisper integration:
1. Start the backend server
2. Record audio on the practice page
3. Submit for analysis
4. Check the transcription in the results

You can also test Whisper directly:
```bash
mamba activate whisper
whisper path/to/audio.webm --model turbo --output_format json --output_dir scripts/ --language en
```

## Troubleshooting

**Error: "Whisper or mamba not found"**
- Ensure mamba is in your PATH
- Check that the "whisper" environment exists: `mamba env list`

**Error: "Whisper transcription failed"**
- Check that Whisper is installed in the environment: `mamba activate whisper && whisper --version`
- Verify the audio file format is supported by Whisper
- Check server logs for detailed error messages

**Error: "Whisper output file not found"**
- Check file permissions on the uploads directory
- Verify Whisper has write access to the output directory
- Check if Whisper generated the JSON file in a different location

## File Structure

```
backend/
  app/
    services/
      __init__.py
      whisper_service.py  # Whisper transcription service
    routers/
      practice.py  # Updated to use Whisper service
uploads/
  audio/  # Audio files stored here
    [uuid].webm  # User recordings
    [uuid].json  # Whisper output (optional, can be deleted after processing)
```

