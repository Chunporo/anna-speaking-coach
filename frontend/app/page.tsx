'use client';

import Sidebar from '@/components/Sidebar';
import { Speaker, Calendar, TrendingUp, Info, Mic, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function Home() {
  const [dailyProgress, setDailyProgress] = useState({ practice_count: 0, target_count: 25 });
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, frozen_streak: 0 });
  const [partProgress, setPartProgress] = useState([
    { part: 1, completed_count: 2, total_count: 203 },
    { part: 2, completed_count: 1, total_count: 78 },
    { part: 3, completed_count: 1, total_count: 234 },
  ]);

  useEffect(() => {
    // Fetch progress data
    const fetchProgress = async () => {
      try {
        const [daily, streakData, partData] = await Promise.all([
          api.get('/api/progress/daily'),
          api.get('/api/progress/streak'),
          api.get('/api/progress/part-progress'),
        ]);
        setDailyProgress(daily.data);
        setStreak(streakData.data);
        setPartProgress(partData.data);
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };
    fetchProgress();
    
    // Refresh every 30 seconds to show updates
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const progressPercentage = (dailyProgress.practice_count / dailyProgress.target_count) * 100;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Today's Task */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Speaker className="text-primary-600" size={24} />
              <h2 className="text-lg font-semibold">Nhiệm vụ hôm nay</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Luyện {dailyProgress.target_count} lần để đạt aim nhé!
            </p>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${(progressPercentage / 100) * 251.2} 251.2`}
                  className="text-primary-600"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-700">
                  {dailyProgress.practice_count}/{dailyProgress.target_count}
                </span>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500">
              Nói nhiều mới tiến bộ được á 😊
            </p>
          </div>

          {/* Streak */}
          <a href="/streak" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow block">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                <span className="text-white font-bold">O</span>
              </div>
              <h2 className="text-lg font-semibold">Day(s) Streak</h2>
            </div>
            <p className="text-gray-600 mb-2">
              Current Streak: <span className="font-bold text-purple-600">{streak.current_streak}</span> days
            </p>
            <p className="text-sm text-gray-500">
              Longest: {streak.longest_streak} days | Frozen: {streak.frozen_streak} days
            </p>
            <p className="text-xs text-primary-600 mt-2">Click to view detailed streak calendar →</p>
          </a>

          {/* Activity Calendar & Forecast */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity Calendar</h3>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                    title={`Day ${i + 1}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Ít</span>
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="h-3 flex-1 rounded"
                      style={{
                        backgroundColor: `rgb(${100 + level * 30}, ${200 - level * 20}, ${100 + level * 20})`,
                      }}
                    />
                  ))}
                </div>
                <span>Nhiều</span>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold">Forecast</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                cập nhật ngày {new Date().toLocaleDateString('vi-VN')}
              </p>
              {partProgress.map((part) => {
                const percentage = (part.completed_count / part.total_count) * 100;
                return (
                  <div key={part.part} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Part {part.part}</span>
                      <span className="text-gray-500">
                        {part.completed_count}/{part.total_count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Các tính năng</h2>

          {/* Practice by Question */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <Mic className="text-purple-600 mt-1" size={32} />
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Luyện theo câu</h3>
                <p className="text-gray-600 mb-4">
                  Trả lời câu hỏi tự chọn. Nhận sửa lỗi và đánh giá liên tục.
                </p>
                <div className="flex gap-3">
                  <a
                    href="/practice?part=1"
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
                  >
                    PART 1 &gt;
                  </a>
                  <a
                    href="/practice?part=2"
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
                  >
                    PART 2 &gt;
                  </a>
                  <a
                    href="/practice?part=3"
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
                  >
                    PART 3 &gt;
                  </a>
                  <a
                    href="/practice?custom=true"
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
                  >
                    Tự thêm câu
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Mock Test */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <FileText className="text-pink-600 mt-1" size={32} />
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Thi Thử</h3>
                <p className="text-gray-600 mb-4">
                  Trả lời một bộ câu hỏi ngẫu nhiên. Cấu trúc giống bài thi thật.
                </p>
                <div className="flex gap-3">
                  <a
                    href="/mock-test?type=PART1"
                    className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors"
                  >
                    PART 1 &gt;
                  </a>
                  <a
                    href="/mock-test?type=PART2"
                    className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors"
                  >
                    PART 2 &gt;
                  </a>
                  <a
                    href="/mock-test?type=PART3"
                    className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors"
                  >
                    PART 3 &gt;
                  </a>
                  <a
                    href="/mock-test?type=FULL"
                    className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors"
                  >
                    FULL TEST &gt;
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features */}
          <div className="flex gap-4">
            <a
              href="/pronunciation"
              className="flex-1 bg-blue-50 text-blue-700 px-6 py-4 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl font-bold">P</span>
              <span>Khóa học phát âm</span>
            </a>
            <button className="flex-1 bg-green-50 text-green-700 px-6 py-4 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
              <span className="text-xl">✓</span>
              <span>Sổ từ vựng</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

