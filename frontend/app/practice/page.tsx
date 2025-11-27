'use client';

import Sidebar from '@/components/Sidebar';
import { Mic, Search, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

interface Question {
  id: number;
  part: number;
  topic: string;
  question_text: string;
}

export default function PracticePage() {
  const searchParams = useSearchParams();
  const part = searchParams.get('part') ? parseInt(searchParams.get('part')!) : 1;
  const custom = searchParams.get('custom') === 'true';

  const [activeTab, setActiveTab] = useState(part);
  const [hideAnswered, setHideAnswered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const endpoint = custom
        ? '/api/questions/user-questions'
        : '/api/questions';
      const response = await api.get(endpoint, {
        params: { part: activeTab },
      });
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await api.get('/api/questions/topics', {
        params: { part: activeTab },
      });
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const filteredQuestions = questions.filter((q) =>
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const questionsByTopic = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.topic]) {
      acc[q.topic] = [];
    }
    acc[q.topic].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Luyện theo câu</h1>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Luyện Part {tab}
                </button>
              ))}
              <button
                onClick={() => {
                  setActiveTab(0);
                  fetchQuestions();
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 0
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Câu Bạn thêm
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setHideAnswered(!hideAnswered)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                {hideAnswered ? <EyeOff size={18} /> : <Eye size={18} />}
                <span>Ẩn câu đã trả lời</span>
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Tìm câu hỏi"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Questions by Topic */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Đang tải...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(questionsByTopic).map(([topic, topicQuestions]) => (
                <div key={topic} className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">{topic}</h2>
                  <div className="space-y-6">
                    {topicQuestions.map((question) => (
                      <div key={question.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-gray-700 flex-1">{question.question_text}</p>
                          <a
                            href={`/practice/${question.id}`}
                            className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                          >
                            <Mic size={16} />
                            Luyện ngay
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        // Create practice sessions for all questions in this topic
                        await Promise.all(
                          topicQuestions.map(q =>
                            api.post('/api/practice/', {
                              question_id: q.id,
                              part: activeTab,
                            })
                          )
                        );
                        alert('Practice sessions created! Calendar updated.');
                        // Refresh questions to show updated state
                        fetchQuestions();
                      } catch (error) {
                        console.error('Error creating practice session:', error);
                        alert('Error creating practice session');
                      }
                    }}
                    className="mt-4 px-6 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors flex items-center gap-2"
                  >
                    <Mic size={18} />
                    Luyện topic này
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

