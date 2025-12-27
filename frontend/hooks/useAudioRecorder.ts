/**
 * Custom hook for audio recording functionality
 */
import { useState, useRef, useEffect } from 'react';
import { AudioRecorder, stopSpeaking } from '@/lib/audioRecorder';
import { AudioRecorderState, AudioRecorderCallback } from '@/lib/types';
import { ERROR_MESSAGES } from '@/lib/constants';

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  const recorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    const callback: AudioRecorderCallback = (newState) => {
      setState({
        isRecording: newState.isRecording || false,
        isPaused: newState.isPaused || false,
        recordingTime: newState.recordingTime || 0,
        audioBlob: newState.audioBlob || null,
        audioUrl: newState.audioUrl || null,
        error: newState.error || null,
      });
    };

    recorderRef.current = new AudioRecorder(callback);

    return () => {
      recorderRef.current?.cleanup();
      stopSpeaking();
    };
  }, []);

  const startRecording = async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await recorderRef.current?.startRecording();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || ERROR_MESSAGES.START_RECORDING,
      }));
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stopRecording();
  };

  const pauseRecording = () => {
    recorderRef.current?.pauseRecording();
  };

  const resumeRecording = () => {
    recorderRef.current?.resumeRecording();
  };

  const resetRecording = () => {
    recorderRef.current?.resetRecording();
    setState(prev => ({
      ...prev,
      audioBlob: null,
      audioUrl: null,
      error: null,
    }));
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
