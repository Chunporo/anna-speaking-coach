/**
 * Custom hook for submitting practice sessions
 */
import { useState } from 'react';
import api from '@/lib/api';
import { PracticeSession, Question } from '@/lib/types';
import { ERROR_MESSAGES } from '@/lib/constants';

export function usePracticeSubmission() {
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<PracticeSession | null>(null);

  const submitRecording = async (
    audioBlob: Blob,
    question: Question,
    onSuccess?: (session: PracticeSession) => void
  ) => {
    if (!audioBlob || !question) return;

    try {
      setSubmitting(true);
      setAnalyzing(true);
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
      formData.append('audio', audioFile);
      formData.append('question_id', question.id.toString());
      formData.append('part', question.part.toString());

      // Submit to backend for analysis
      const response = await api.post('/api/practice/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const session: PracticeSession = response.data;
      setLastSubmission(session);

      if (onSuccess) {
        onSuccess(session);
      }

    } catch (err: any) {
      console.error('Error submitting recording:', err);
      setError(err.response?.data?.detail || ERROR_MESSAGES.SUBMIT_AUDIO);
    } finally {
      setSubmitting(false);
      setAnalyzing(false);
    }
  };

  return {
    submitting,
    analyzing,
    error,
    lastSubmission,
    submitRecording,
    setError,
  };
}
