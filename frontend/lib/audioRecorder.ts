/**
 * Audio recording and text-to-speech utilities
 */
import { AudioRecorderState, AudioRecorderCallback } from './types';

// Text-to-speech state
let currentSpeech: SpeechSynthesisUtterance | null = null;

/**
 * AudioRecorder class for recording audio using MediaRecorder API
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private callback: AudioRecorderCallback;
  private recordingTimeInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private pausedTime = 0;
  private isPaused = false;
  private generation = 0;
  private audioUrl: string | null = null;

  constructor(callback: AudioRecorderCallback) { this.callback = callback; }

  async startRecording(): Promise<void> {
    this.cleanup();
    const generation = this.generation;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.mediaRecorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (generation !== this.generation) return;
        this.stream = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        this.audioUrl = URL.createObjectURL(blob);
        this.callback({ isRecording: false, isPaused: false, recordingTime: this.getRecordingTime(), audioBlob: blob, audioUrl: this.audioUrl, error: null });
      };
      this.startTime = Date.now(); this.pausedTime = 0; this.isPaused = false;
      recorder.start();
      this.callback({ isRecording: true, isPaused: false, recordingTime: 0, audioBlob: null, audioUrl: null, error: null });
      this.recordingTimeInterval = setInterval(() => {
        if (this.getRecordingTime() >= 300) { this.stopRecording(); return; }
        if (!this.isPaused) this.callback({ isRecording: true, isPaused: false, recordingTime: this.getRecordingTime(), audioBlob: null, audioUrl: null, error: null });
      }, 100);
    } catch (error: any) {
      if (generation !== this.generation) return;
      this.cleanup();
      this.callback({ isRecording: false, isPaused: false, recordingTime: 0, audioBlob: null, audioUrl: null, error: error.message || 'Failed to access microphone' });
      throw error;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      if (!this.isPaused) this.pausedTime += Date.now() - this.startTime;
      this.isPaused = true;
      this.mediaRecorder.stop();
    }
    if (this.recordingTimeInterval) clearInterval(this.recordingTimeInterval);
    this.recordingTimeInterval = null;
  }

  pauseRecording(): void {
    if (this.mediaRecorder?.state !== 'recording') return;
    this.mediaRecorder.pause();
    this.pausedTime += Date.now() - this.startTime; this.isPaused = true;
    this.callback({ isRecording: true, isPaused: true, recordingTime: this.getRecordingTime(), audioBlob: null, audioUrl: null, error: null });
  }

  resumeRecording(): void {
    if (this.mediaRecorder?.state !== 'paused') return;
    this.mediaRecorder.resume(); this.isPaused = false; this.startTime = Date.now();
    this.callback({ isRecording: true, isPaused: false, recordingTime: this.getRecordingTime(), audioBlob: null, audioUrl: null, error: null });
  }

  resetRecording(): void {
    this.cleanup(); this.startTime = 0; this.pausedTime = 0; this.isPaused = false;
    this.callback({ isRecording: false, isPaused: false, recordingTime: 0, audioBlob: null, audioUrl: null, error: null });
  }

  cleanup(): void {
    this.generation++;
    this.stopRecording();
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
  }

  private getRecordingTime(): number {
    if (!this.startTime) return 0;
    return Math.floor((this.pausedTime + (this.isPaused ? 0 : Date.now() - this.startTime)) / 1000);
  }
}

/**
 * Speak text using Web Speech API
 */
export async function speakText(text: string, questionId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Stop any ongoing speech
    stopSpeaking();

    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported in this browser'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    currentSpeech = utterance;

    // Configure utterance
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      currentSpeech = null;
      resolve();
    };

    utterance.onerror = (error) => {
      currentSpeech = null;
      reject(error);
    };

    // Speak
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentSpeech = null;
}



