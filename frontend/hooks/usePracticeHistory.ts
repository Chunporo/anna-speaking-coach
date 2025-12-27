/**
 * Custom hook for fetching practice history
 */
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { PracticeHistory } from '@/lib/types';

export function usePracticeHistory(questionId: number) {
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPracticeHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/practice/question/${questionId}`);
      setPracticeHistory(response.data);
    } catch (err) {
      console.error('Error fetching practice history:', err);
      setError('Failed to load practice history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questionId) {
      fetchPracticeHistory();
    }
  }, [questionId]);

  return { practiceHistory, loading, error, refetch: fetchPracticeHistory };
}
