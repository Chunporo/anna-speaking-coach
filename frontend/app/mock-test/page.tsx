'use client';

import Sidebar from '@/components/Sidebar';
import { FileText, Clock, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

interface MockTest {
  id: number;
  test_type: string;
  created_at: string;
  fluency_score?: number;
  vocabulary_score?: number;
  grammar_score?: number;
  pronunciation_score?: number;
}

export default function MockTestPage() {
  const searchParams = useSearchParams();
  const testType = searchParams.get('type') || 'FULL';
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockTests();
  }, []);

  const fetchMockTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/mock-test/');
      setMockTests(response.data);
    } catch (error) {
      console.error('Error fetching mock tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTest = async (type: string) => {
    try {
      const response = await api.post('/api/mock-test/', { test_type: type });
      // Redirect to test taking page
      window.location.href = `/mock-test/${response.data.id}`;
    } catch (error) {
      console.error('Error starting test:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Thi thử</h1>
            <p className="text-gray-600">
              Làm thử bài test Speaking và nhận ước tính điểm, sửa lỗi và hướng dẫn cải thiện.
            </p>
          </div>

          {/* Test Options */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            <button
              onClick={() => startTest('PART1')}
              className="px-6 py-4 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors text-center"
            >
              Thi PART 1
            </button>
            <button
              onClick={() => startTest('PART2')}
              className="px-6 py-4 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors text-center"
            >
              Thi PART 2
            </button>
            <button
              onClick={() => startTest('PART3')}
              className="px-6 py-4 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors text-center"
            >
              Thi PART 3
            </button>
            <button
              onClick={() => startTest('FULL')}
              className="px-6 py-4 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors text-center"
            >
              FULL TEST
            </button>
          </div>

          {/* Test History */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Lịch sử thi thử</h2>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Đang tải...</p>
              </div>
            ) : mockTests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chưa có lịch sử thi thử</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mockTests.map((test) => {
                  const testDate = new Date(test.created_at);
                  return (
                    <div
                      key={test.id}
                      className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="text-primary-600" size={20} />
                            <h3 className="font-semibold text-gray-800">
                              TEST {test.test_type}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                            <Clock size={14} />
                            <span>
                              {testDate.toLocaleDateString('vi-VN')} {testDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {test.fluency_score !== null ? (
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Trôi chảy</p>
                                <p className="font-semibold">
                                  {test.fluency_score ? test.fluency_score.toFixed(1) : '?'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Từ vựng</p>
                                <p className="font-semibold">
                                  {test.vocabulary_score ? test.vocabulary_score.toFixed(1) : '?'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Ngữ pháp</p>
                                <p className="font-semibold">
                                  {test.grammar_score ? test.grammar_score.toFixed(1) : '?'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Phát âm</p>
                                <p className="font-semibold">
                                  {test.pronunciation_score ? test.pronunciation_score.toFixed(1) : '?'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <CheckCircle size={16} />
                              <span className="text-sm">Đang chấm điểm...</span>
                            </div>
                          )}
                        </div>
                        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <span className="text-gray-400">⋮</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

