/**
 * Application constants
 */

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Google OAuth
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// IELTS Parts
export const IELTS_PARTS = [1, 2, 3] as const;
export type IELTSPart = typeof IELTS_PARTS[number];

// Default Scores
export const DEFAULT_SCORE = 5.0;

// Recording
export const MAX_RECORDING_TIME = 300; // 5 minutes in seconds
export const MIN_RECORDING_TIME = 1; // 1 second minimum

// Audio
export const DEFAULT_AUDIO_FORMAT = 'audio/webm';

// Error Messages
export const ERROR_MESSAGES = {
  FETCH_QUESTION: 'Failed to load question',
  FETCH_HISTORY: 'Failed to load practice history',
  START_RECORDING: 'Failed to start recording. Please check microphone permissions.',
  STOP_RECORDING: 'Failed to stop recording',
  SUBMIT_AUDIO: 'Failed to submit audio for analysis',
  PLAY_AUDIO: 'Failed to play question audio',
  SPEAK_TEXT: 'Failed to play question audio',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  AUDIO_SUBMITTED: 'Audio submitted successfully',
  RECORDING_STOPPED: 'Recording stopped',
} as const;

// UI Labels
export const UI_LABELS = {
  RECORD: 'Record',
  STOP: 'Stop',
  PAUSE: 'Pause',
  RESUME: 'Resume',
  RESET: 'Reset',
  SUBMIT: 'Submit for Analysis',
  PLAY_QUESTION: 'Play Question',
  STOP_QUESTION: 'Stop Question',
  ANALYZING: 'Analyzing...',
  LOADING: 'Loading...',
} as const;



