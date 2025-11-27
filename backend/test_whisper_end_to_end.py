#!/usr/bin/env python3
"""
End-to-end test of Whisper transcription with a real audio file
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.whisper_service import transcribe_audio

def main():
    # Test with the sample audio file
    audio_file = Path(__file__).parent.parent / "speaking-sample-1a.wav"
    
    if not audio_file.exists():
        print(f"✗ Test audio file not found: {audio_file}")
        print("  Skipping end-to-end test")
        return 1
    
    print("=" * 60)
    print("Whisper End-to-End Test")
    print("=" * 60)
    print(f"\nTesting with audio file: {audio_file.name}")
    print(f"File size: {audio_file.stat().st_size / 1024 / 1024:.2f} MB")
    
    try:
        print("\n⏳ Starting Whisper transcription (this may take a minute)...")
        transcription = transcribe_audio(audio_file)
        
        print("\n✓ Transcription successful!")
        print(f"\nTranscribed text ({len(transcription)} characters):")
        print("-" * 60)
        print(transcription[:500] + "..." if len(transcription) > 500 else transcription)
        print("-" * 60)
        
        if transcription and len(transcription) > 10:
            print("\n✅ Whisper integration is working correctly!")
            return 0
        else:
            print("\n⚠️  Transcription seems too short or empty")
            return 1
            
    except Exception as e:
        print(f"\n✗ Transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

