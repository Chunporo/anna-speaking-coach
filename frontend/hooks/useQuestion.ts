/**
 * Custom hook for fetching and managing question data
 */
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Question } from '@/lib/types';
import { ERROR_MESSAGES } from '@/lib/constants';

export function useQuestion(questionId: number) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/questions/${questionId}`);
        setQuestion(response.data);
      } catch (err) {
        console.error('Error fetching question:', err);
        setError(ERROR_MESSAGES.FETCH_QUESTION);
      } finally {
        setLoading(false);
      }
    };

    if (questionId) {
      fetchQuestion();
    }
  }, [questionId]);

  return { question, loading, error };
}
