# How to Check Which Transcription Service Was Used

## Methods to Check

### 1. **Backend Logs** (Most Reliable)
Check your backend server console/logs. You'll see messages like:
- `✅ Google Cloud Speech-to-Text succeeded` 
- `✅ Whisper transcription succeeded`
- `🔄 Falling back to Whisper...`

### 2. **Browser Console** (Frontend)
Open browser Developer Tools (F12) → Console tab. Look for:
```
✓ Transcription succeeded using: Google Cloud Speech-to-Text
   Method: google
```
or
```
✓ Transcription succeeded using: Whisper (Local)
   Method: whisper
```

### 3. **API Response**
The `/api/transcription/transcribe` endpoint returns:
```json
{
  "transcription": "your transcribed text",
  "method": "google" or "whisper",
  "method_display": "Google Cloud Speech-to-Text" or "Whisper (Local)",
  "language_code": "en-US"
}
```

### 4. **Check Service Status**
Call the status endpoint:
```bash
curl http://localhost:8000/api/transcription/transcribe/status
```

Response:
```json
{
  "google_speech": {
    "available": true/false,
    "error": null or error message
  },
  "whisper": {
    "available": true,
    "error": null
  }
}
```

### 5. **Visual Indicator in UI**
When viewing transcription results, you'll see a badge:
- 🔵 **Google** - Used Google Cloud Speech-to-Text
- 🟢 **Whisper** - Used local Whisper

## Quick Check Script

You can also use this in your browser console:
```javascript
// Check transcription service status
fetch('http://localhost:8000/api/transcription/transcribe/status')
  .then(r => r.json())
  .then(data => {
    console.log('Google Speech:', data.google_speech.available ? '✅ Available' : '❌ Not available');
    console.log('Whisper:', data.whisper.available ? '✅ Available' : '❌ Not available');
  });
```

## Understanding the Fallback Logic

1. **First**: System tries Google Cloud Speech-to-Text (if `use_google=true`)
2. **If Google fails**: Automatically falls back to Whisper
3. **If both fail**: Returns error message

The method used is always logged and returned in the response.

