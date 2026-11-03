/**
 * TypeScript type definitions
 */

// Question types
export interface Question {
  id: number;
  part: number;
  topic: string;
  question_text: string;
}

// Practice Session types
export interface PracticeSession {
  id: number;
  question_id: number;
  part: number;
  audio_url: string | null;
  transcription: string | null;
  fluency_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  pronunciation_score: number | null;
  overall_band: number | null;
  feedback: string | null;
  created_at: string;
}

export interface PracticeHistory {
  sessions: PracticeSession[];
  total_practices: number;
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  is_premium: boolean;
  created_at: string;
}

// Progress types
export interface DailyProgress {
  date: string;
  practice_count: number;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  frozen_streak: number;
}

export interface PartProgress {
  part: number;
  completed_count: number;
  total_count: number;
}

// Feedback types
export interface FeedbackDetail {
  id: number;
  question_id: number;
  question_text: string | null;
  part: number;
  transcription: string | null;
  audio_url: string | null;
  overall_band: number | null;
  fluency_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  pronunciation_score: number | null;
  feedback: string | null;
  strengths: string[];
  improvements: string[];
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  created_at: string;
}

// Audio Recorder types
export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

export type AudioRecorderCallback = (state: AudioRecorderState) => void;



