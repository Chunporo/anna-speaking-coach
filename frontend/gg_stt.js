// Speech-to-Text service with Google Cloud Speech-to-Text as primary option
// Falls back to Whisper (local) via backend API if Google API fails

// For Node.js environment
let speechClient = null;
if (typeof require !== 'undefined') {
  try {
    const speech = require('@google-cloud/speech');
    speechClient = new speech.SpeechClient();
  } catch (error) {
    console.warn('Google Cloud Speech client not available:', error.message);
  }
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 * @param {Buffer|Blob|string} audioData - Audio data (Buffer for Node.js, Blob for browser, or file path)
 * @param {Object} options - Configuration options
 * @param {string} options.encoding - Audio encoding (default: 'WEBM_OPUS' for webm, 'LINEAR16' for raw)
 * @param {number} options.sampleRateHertz - Sample rate (default: 48000 for webm, 16000 for raw)
 * @param {string} options.languageCode - Language code (default: 'en-US')
 * @returns {Promise<string>} Transcribed text
 */
async function transcribeWithGoogle(audioData, options = {}) {
  const {
    encoding = 'WEBM_OPUS',
    sampleRateHertz = 48000,
    languageCode = 'en-US'
  } = options;

  // For Node.js environment with Google Cloud client
  if (speechClient) {
    try {
      let audioContent;
      
      // Handle different input types
      if (typeof audioData === 'string') {
        // File path - read the file
        const fs = require('fs');
        audioContent = fs.readFileSync(audioData).toString('base64');
      } else if (Buffer.isBuffer(audioData)) {
        audioContent = audioData.toString('base64');
      } else {
        throw new Error('Unsupported audio data type for Node.js environment');
      }

      const request = {
        audio: {
          content: audioContent,
        },
        config: {
          encoding: encoding,
          sampleRateHertz: sampleRateHertz,
          languageCode: languageCode,
        },
      };

      const [response] = await speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        throw new Error('No transcription results from Google Speech-to-Text');
      }

      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      
      return transcription;
    } catch (error) {
      throw new Error(`Google Speech-to-Text error: ${error.message}`);
    }
  }

  // For browser environment - use backend endpoint
  const API_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 
                  (typeof window !== 'undefined' && window.location.origin.replace(':3000', ':8000')) ||
                  'http://localhost:8000';
  
  try {
    const formData = new FormData();
    const audioFile = audioData instanceof File ? audioData : new File([audioData], 'audio.webm', { type: 'audio/webm' });
    formData.append('audio', audioFile);
    formData.append('use_google', 'true');
    formData.append('language_code', languageCode);

    // Get auth token if available
    const token = typeof window !== 'undefined' && localStorage.getItem('access_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/transcription/transcribe`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.transcription || '';
  } catch (error) {
    throw new Error(`Google Speech-to-Text API error: ${error.message}`);
  }
}

/**
 * Transcribe audio using Whisper via backend API
 * @param {Blob|File} audioBlob - Audio blob/file
 * @param {number} questionId - Question ID (optional, for practice session)
 * @param {number} part - Part number (optional, for practice session)
 * @param {string} apiUrl - Backend API URL (default: from env or localhost:8000)
 * @param {string} languageCode - Language code (default: 'en-US')
 * @returns {Promise<string>} Transcribed text
 */
async function transcribeWithWhisper(audioBlob, questionId = null, part = null, apiUrl = null, languageCode = 'en-US') {
  const API_URL = apiUrl || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 
                  (typeof window !== 'undefined' && window.location.origin.replace(':3000', ':8000')) ||
                  'http://localhost:8000';
  
  try {
    const formData = new FormData();
    const audioFile = audioBlob instanceof File ? audioBlob : new File([audioBlob], 'recording.webm', { type: audioBlob.type || 'audio/webm' });
    formData.append('audio', audioFile);
    formData.append('use_google', 'false'); // Explicitly use Whisper
    formData.append('language_code', languageCode);

    // Get auth token if available
    const token = typeof window !== 'undefined' && localStorage.getItem('access_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/transcription/transcribe`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.transcription || '';
  } catch (error) {
    throw new Error(`Whisper transcription error: ${error.message}`);
  }
}

/**
 * Transcribe audio with fallback: tries Google Cloud Speech-to-Text first, falls back to Whisper
 * Uses the unified backend endpoint that handles fallback automatically
 * @param {Buffer|Blob|File|string} audioData - Audio data
 * @param {Object} options - Configuration options
 * @param {number} options.questionId - Question ID (optional, for practice session)
 * @param {number} options.part - Part number (optional, for practice session)
 * @param {string} options.apiUrl - Backend API URL
 * @param {string} options.encoding - Audio encoding for Google API (Node.js only)
 * @param {number} options.sampleRateHertz - Sample rate for Google API (Node.js only)
 * @param {string} options.languageCode - Language code (default: 'en-US')
 * @param {boolean} options.useGoogle - Whether to try Google first (default: true)
 * @returns {Promise<{transcription: string, method: 'google'|'whisper'}>} Transcription result with method used
 */
async function transcribeAudio(audioData, options = {}) {
  const {
    questionId,
    part,
    apiUrl,
    encoding,
    sampleRateHertz,
    languageCode = 'en-US',
    useGoogle = true
  } = options;

  const API_URL = apiUrl || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 
                  (typeof window !== 'undefined' && window.location.origin.replace(':3000', ':8000')) ||
                  'http://localhost:8000';

  // For Node.js with direct Google Cloud client, try that first
  if (speechClient && useGoogle && typeof require !== 'undefined') {
    try {
      console.log('Attempting transcription with Google Cloud Speech-to-Text (Node.js client)...');
      const transcription = await transcribeWithGoogle(audioData, {
        encoding,
        sampleRateHertz,
        languageCode
      });
      
      if (transcription && transcription.trim()) {
        console.log('✓ Google Cloud Speech-to-Text succeeded');
        return {
          transcription: transcription.trim(),
          method: 'google'
        };
      }
    } catch (error) {
      console.warn('Google Cloud Speech-to-Text (Node.js) failed:', error.message);
      console.log('Falling back to backend endpoint...');
    }
  }

  // Use backend endpoint (handles Google + Whisper fallback automatically)
  // For browser: use FormData with Blob/File
  // For Node.js: use axios or form-data library for better FormData support
  try {
    // Convert audioData to Blob/File for FormData
    let audioFile;
    if (audioData instanceof Blob || audioData instanceof File) {
      audioFile = audioData;
    } else if (Buffer.isBuffer(audioData)) {
      if (typeof Blob !== 'undefined') {
        audioFile = new Blob([audioData], { type: 'audio/webm' });
      } else {
        // Node.js - use axios with form-data library or convert to base64
        throw new Error('Buffer input in Node.js requires form-data library or use file path instead');
      }
    } else if (typeof audioData === 'string') {
      // File path
      if (typeof require !== 'undefined') {
        // Node.js - read file and create Blob if available
        const fs = require('fs');
        const buffer = fs.readFileSync(audioData);
        if (typeof Blob !== 'undefined') {
          audioFile = new Blob([buffer], { type: 'audio/webm' });
        } else {
          // Use axios with form-data for Node.js
          const FormData = require('form-data');
          const formData = new FormData();
          formData.append('audio', fs.createReadStream(audioData));
          formData.append('use_google', useGoogle ? 'true' : 'false');
          formData.append('language_code', languageCode);
          
          const token = typeof window !== 'undefined' && localStorage.getItem('access_token');
          const axios = require('axios');
          const response = await axios.post(`${API_URL}/api/transcription/transcribe`, formData, {
            headers: {
              ...formData.getHeaders(),
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          
          console.log(`✓ Transcription succeeded using ${response.data.method}`);
          return {
            transcription: response.data.transcription.trim(),
            method: response.data.method
          };
        }
      } else {
        throw new Error('File path not supported in browser environment');
      }
    } else {
      throw new Error('Unsupported audio data type');
    }

    // Browser or Node.js with Blob support
    const formData = new FormData();
    const file = audioFile instanceof File ? audioFile : new File([audioFile], 'audio.webm', { type: 'audio/webm' });
    formData.append('audio', file);
    formData.append('use_google', useGoogle ? 'true' : 'false');
    formData.append('language_code', languageCode);

    // Get auth token if available
    const token = typeof window !== 'undefined' && localStorage.getItem('access_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`Attempting transcription via backend endpoint (use_google=${useGoogle})...`);
    const response = await fetch(`${API_URL}/api/transcription/transcribe`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const methodDisplay = data.method_display || (data.method === 'google' ? 'Google Cloud Speech-to-Text' : 'Whisper (Local)');
    console.log(`✓ Transcription succeeded using: ${methodDisplay}`);
    console.log(`   Method: ${data.method}`);
    return {
      transcription: data.transcription.trim(),
      method: data.method,
      method_display: methodDisplay
    };
  } catch (error) {
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    transcribeAudio,
    transcribeWithGoogle,
    transcribeWithWhisper
  };
}

// For browser/ES6 module usage
if (typeof window !== 'undefined') {
  window.speechToText = {
    transcribeAudio,
    transcribeWithGoogle,
    transcribeWithWhisper
  };
}

