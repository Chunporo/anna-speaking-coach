'use client';

import Sidebar from '@/components/Sidebar';
import FeedbackRenderer from '@/components/FeedbackRenderer';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Mic, Play, Pause, Square, Volume2, RotateCcw,
  Clock, CheckCircle2,
  Loader2, Sparkles, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useQuestion } from '@/hooks/useQuestion';
import { usePracticeHistory } from '@/hooks/usePracticeHistory';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { usePracticeSubmission } from '@/hooks/usePracticeSubmission';
import { formatTime, getScoreColor, calculateOverallScore } from '@/lib/utils';
import { PracticeSession } from '@/lib/types';

export default function QuestionPracticePage() {
  const params = useParams();
  const router = useRouter();
  const questionId = parseInt(params.questionId as string);

  // Custom hooks
  const { question, loading: questionLoading, error: questionError } = useQuestion(questionId);
  const { practiceHistory, refetch: refetchHistory } = usePracticeHistory(questionId);
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    error: recorderError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();
  const {
    isPlaying,
    isSpeaking,
    error: playbackError,
    playRecording,
    stopPlayback,
    speakQuestion,
  } = useAudioPlayback();
  const {
    submitting,
    analyzing,
    error: submissionError,
    lastSubmission,
    submitRecording,
    setError: setSubmissionError,
  } = usePracticeSubmission();

  const [expandedFeedback, setExpandedFeedback] = useState<{ [key: number]: boolean }>({});

  // Combined error state
  const audioError = recorderError || playbackError || submissionError || questionError;

  // Handle submission with auto-play
  const handleSubmitRecording = async () => {
    if (!audioBlob || !question) return;

    await submitRecording(audioBlob, question, async (session) => {
      await refetchHistory();
      // Auto-play the question after submission
      setTimeout(() => {
        if (question) {
          speakQuestion(question.question_text, question.id);
        }
      }, 500);
    });
  };

  const handleResetRecording = () => {
    resetRecording();
    setSubmissionError(null);
  };

  const handleSpeakQuestion = () => {
    if (question) {
      speakQuestion(question.question_text, question.id);
    }
  };

  const handlePlayRecording = () => {
    if (audioUrl) {
      playRecording(audioUrl);
    }
  };

  const getOverallScore = (session: PracticeSession): number | null => {
    return calculateOverallScore(
      session.fluency_score,
      session.vocabulary_score,
      session.grammar_score,
      session.pronunciation_score
    );
  };

  const loading = questionLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </main>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <p className="text-gray-600">Question not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => router.push('/practice')}
              className="hover:text-primary-600 transition-colors"
            >
              Luyện từng câu
            </button>
            <span>/</span>
            <span>PART {question.part}</span>
            <span>/</span>
            <span className="text-gray-800 font-medium truncate max-w-md">
              {question.question_text}
            </span>
          </div>

          {/* Practice History */}
          {practiceHistory && practiceHistory.total_practices > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-blue-600" size={20} />
                <span className="text-blue-900 font-medium">
                  Đã luyện: {practiceHistory.total_practices} lần
                </span>
              </div>
              {practiceHistory.sessions.length > 0 && practiceHistory.sessions[0] && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Điểm cao nhất:</span>
                  <div className={`text-2xl font-bold ${getScoreColor(getOverallScore(practiceHistory.sessions[0]))}`}>
                    {getOverallScore(practiceHistory.sessions[0])?.toFixed(1) || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Question Card */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    PART {question.part}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {question.topic}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                  {question.question_text}
                </h1>
                <p className="text-gray-600 text-sm">
                  Nhấn nút Ghi âm ngay ở dưới để trả lời câu hỏi
                </p>
              </div>
              <button
                onClick={handleSpeakQuestion}
                disabled={isSpeaking}
                className="p-3 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors disabled:opacity-50"
                title="Nghe câu hỏi"
              >
                {isSpeaking ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <Volume2 size={24} />
                )}
              </button>
            </div>

            {/* Error Message */}
            {audioError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle size={18} />
                <span className="text-sm">{audioError}</span>
              </div>
            )}

            {/* Recording Timer */}
            {isRecording && (
              <div className="mb-6 flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-lg font-mono font-semibold text-red-600">
                    {formatTime(recordingTime)}
                  </span>
                </div>
                <span className="text-gray-600">Đang ghi âm...</span>
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex flex-col items-center gap-4">
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  disabled={submitting || analyzing}
                  className="px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold text-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-3 shadow-lg"
                >
                  <Mic size={24} />
                  <span>Ghi âm ngay</span>
                </button>
              )}

              {isRecording && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center gap-2"
                  >
                    {isPaused ? <Play size={20} /> : <Pause size={20} />}
                    <span>{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
                  </button>
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <Square size={20} />
                    <span>Dừng</span>
                  </button>
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={isPlaying ? stopPlayback : handlePlayRecording}
                    disabled={!audioUrl}
                    className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {isPlaying ? <Square size={24} /> : <Play size={24} />}
                  </button>
                    <span className="text-sm text-gray-600">
                      Thời lượng: {formatTime(recordingTime)}
                    </span>
                    <button
                      onClick={handleResetRecording}
                      className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>

                  <button
                    onClick={handleSubmitRecording}
                    disabled={submitting || analyzing}
                    className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        <span>Gửi để phân tích</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Last Submission Result */}
          {lastSubmission && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={24} />
                Kết quả phân tích
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Trôi chảy</div>
                  <div className={`text-2xl font-bold ${getScoreColor(lastSubmission.fluency_score)}`}>
                    {lastSubmission.fluency_score?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Từ vựng</div>
                  <div className={`text-2xl font-bold ${getScoreColor(lastSubmission.vocabulary_score)}`}>
                    {lastSubmission.vocabulary_score?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Ngữ pháp</div>
                  <div className={`text-2xl font-bold ${getScoreColor(lastSubmission.grammar_score)}`}>
                    {lastSubmission.grammar_score?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Phát âm</div>
                  <div className={`text-2xl font-bold ${getScoreColor(lastSubmission.pronunciation_score)}`}>
                    {lastSubmission.pronunciation_score?.toFixed(1) || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-center mb-3">
                  <div className="text-sm text-gray-600 mb-1">Tổng điểm</div>
                  <div className={`text-4xl font-bold ${getScoreColor(getOverallScore(lastSubmission))}`}>
                    {getOverallScore(lastSubmission)?.toFixed(1) || 'N/A'}
                  </div>
                </div>
              </div>

              {lastSubmission.transcription && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-700">Bản ghi chép:</div>
                    {/* Transcription method indicator */}
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                      {lastSubmission.transcription.includes('Google Cloud') ? '🔵 Google' :
                       lastSubmission.transcription.includes('Whisper') ? '🟢 Whisper' :
                       '🎤 Transcription'}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    {lastSubmission.transcription}
                  </div>
                </div>
              )}

              {lastSubmission.feedback && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-800 mb-3">Nhận xét chi tiết:</div>
                  <FeedbackRenderer feedback={lastSubmission.feedback} />
                </div>
              )}

              <button
                onClick={() => {
                  handleResetRecording();
                  handleSpeakQuestion();
                }}
                className="mt-4 w-full px-6 py-3 bg-primary-100 text-primary-700 rounded-lg font-medium hover:bg-primary-200 transition-colors"
              >
                Luyện lại câu này
              </button>
            </div>
          )}

          {/* Practice History */}
          {practiceHistory && practiceHistory.sessions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={24} />
                Lịch sử luyện tập
              </h2>
              <div className="space-y-4">
                {practiceHistory.sessions.slice(0, 5).map((session, index) => {
                  const overallScore = getOverallScore(session);
                  const sessionDate = new Date(session.created_at);
                  const daysAgo = Math.floor((Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpanded = expandedFeedback[session.id] || false;

                  return (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getScoreColor(overallScore)} bg-gray-100`}>
                            {overallScore?.toFixed(1) || 'N/A'}
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">
                              {daysAgo === 0 ? 'Hôm nay' : daysAgo === 1 ? '1 ngày trước' : `${daysAgo} ngày trước`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {sessionDate.toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (session.audio_url) {
                                const audioUrl = session.audio_url.startsWith('http')
                                  ? session.audio_url
                                  : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${session.audio_url}`;
                                const audio = new Audio(audioUrl);
                                audio.play();
                              }
                            }}
                            className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                            disabled={!session.audio_url}
                            title="Phát lại bản ghi"
                          >
                            <Play size={18} />
                          </button>
                          {session.feedback && (
                            <button
                              onClick={() => {
                                setExpandedFeedback({
                                  ...expandedFeedback,
                                  [session.id]: !isExpanded,
                                });
                              }}
                              className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                              title={isExpanded ? 'Ẩn phản hồi' : 'Xem phản hồi'}
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {session.transcription && (
                        <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                          {session.transcription}
                        </div>
                      )}

                      <div className="flex gap-4 text-xs mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Trôi chảy: {session.fluency_score?.toFixed(1) || 'N/A'}</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Từ vựng: {session.vocabulary_score?.toFixed(1) || 'N/A'}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Ngữ pháp: {session.grammar_score?.toFixed(1) || 'N/A'}</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Phát âm: {session.pronunciation_score?.toFixed(1) || 'N/A'}</span>
                      </div>

                      {/* Feedback Section */}
                      {session.feedback && isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm font-semibold text-gray-800 mb-3">Nhận xét chi tiết:</div>
                          <FeedbackRenderer feedback={session.feedback} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
