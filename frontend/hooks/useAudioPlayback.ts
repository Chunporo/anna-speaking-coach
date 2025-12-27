/**
 * Custom hook for audio playback functionality
 */
import { useState, useRef } from 'react';
import { speakText, stopSpeaking } from '@/lib/audioRecorder';
import { ERROR_MESSAGES } from '@/lib/constants';

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const playRecording = (audioUrl: string) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Failed to play recording');
      };
      audio.play();
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
      setIsPlaying(false);
    }
  };

  const speakQuestion = async (questionText: string, questionId: number) => {
    setIsSpeaking(true);
    setError(null);
    stopSpeaking(); // Stop any ongoing speech
    try {
      await speakText(questionText, questionId);
    } catch (err) {
      console.error('Error speaking text:', err);
      setError(ERROR_MESSAGES.SPEAK_TEXT);
    } finally {
      setIsSpeaking(false);
    }
  };

  return {
    isPlaying,
    isSpeaking,
    error,
    playRecording,
    stopPlayback,
    speakQuestion,
  };
}
