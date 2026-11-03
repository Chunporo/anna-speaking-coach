/**
 * Utility functions
 */

/**
 * Format seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get color class for score display
 */
export function getScoreColor(score: number | null): string {
  if (!score) return 'text-gray-400';
  if (score >= 7) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Calculate overall score from individual scores
 */
export function calculateOverallScore(
  fluency: number | null,
  vocabulary: number | null,
  grammar: number | null,
  pronunciation: number | null
): number | null {
  if (!fluency || !vocabulary || !grammar || !pronunciation) {
    return null;
  }
  const avg = (fluency + vocabulary + grammar + pronunciation) / 4;
  return Math.round(avg * 10) / 10;
}



