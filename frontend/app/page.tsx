'use client';

import Sidebar from '@/components/Sidebar';
import { Speaker, Calendar, TrendingUp, Info, Mic, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { format, subDays, startOfWeek, isToday, getMonth, addDays } from 'date-fns';
import api from '@/lib/api';

interface ActivityDay {
  date: string;
  practice_count: number;
}

export default function Home() {
  const [dailyProgress, setDailyProgress] = useState({ practice_count: 0, target_count: 25 });
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, frozen_streak: 0 });
  const [partProgress, setPartProgress] = useState([
    { part: 1, completed_count: 2, total_count: 203 },
    { part: 2, completed_count: 1, total_count: 78 },
    { part: 3, completed_count: 1, total_count: 234 },
  ]);
  const [activityCalendar, setActivityCalendar] = useState<ActivityDay[]>([]);
  const [yearlyHeatmap, setYearlyHeatmap] = useState<Array<{ date: string; practice_count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch progress data
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const [daily, streakData, partData, analyticsData] = await Promise.all([
          api.get('/api/progress/daily'),
          api.get('/api/progress/streak'),
          api.get('/api/progress/part-progress'),
          api.get('/api/progress/streak-analytics').catch(() => ({ data: { yearly_heatmap: [] } })),
        ]);
        setDailyProgress(daily.data);
        setStreak(streakData.data);
        setPartProgress(partData.data);
        setYearlyHeatmap(analyticsData.data?.yearly_heatmap || []);
        // Also set activityCalendar for backward compatibility
        setActivityCalendar(analyticsData.data?.yearly_heatmap?.map((item: { date: string; practice_count: number }) => ({
          date: item.date,
          practice_count: item.practice_count
        })) || []);
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
    
    // Refresh every 30 seconds to show updates
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const progressPercentage = (dailyProgress.practice_count / dailyProgress.target_count) * 100;

  // Build GitHub-style yearly heatmap
  const today = new Date();
  const oneYearAgo = subDays(today, 365);
  const startDate = startOfWeek(oneYearAgo, { weekStartsOn: 1 }); // Monday as week start
  const endDate = today;
  
  // Create activity map for quick lookup
  const activityMap = new Map<string, number>();
  yearlyHeatmap.forEach(item => {
    let dateStr = item.date;
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    activityMap.set(dateStr, item.practice_count);
  });

  // Get max practice count for intensity calculation
  const maxPractice = Math.max(...Array.from(activityMap.values()), 1);

  // Build weeks array (each week is a column)
  const weeks: Date[][] = [];
  let currentWeekStart = startDate;
  
  while (currentWeekStart <= endDate) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentWeekStart, i);
      if (day <= endDate && day >= oneYearAgo) {
        week.push(day);
      } else {
        week.push(day); // Include for alignment
      }
    }
    weeks.push(week);
    currentWeekStart = addDays(currentWeekStart, 7);
  }

  // Get activity intensity and color
  const getActivityIntensity = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = activityMap.get(dateStr) || 0;
    if (count === 0) return 0;
    return Math.min(Math.ceil((count / maxPractice) * 4), 4);
  };

  const getActivityColor = (date: Date): string => {
    const intensity = getActivityIntensity(date);
    if (intensity === 0) {
      return isToday(date) ? '#cbd5e1' : '#f3f4f6';
    }
    // Purple gradient: light to dark
    const opacity = 0.3 + (intensity / 4) * 0.7;
    return `rgba(147, 51, 234, ${opacity})`;
  };

  // Get month labels (show month when week contains first day of month)
  const getMonthLabel = (weekIndex: number): string | null => {
    if (weekIndex >= weeks.length) return null;
    const firstDay = weeks[weekIndex][0];
    if (!firstDay || firstDay < oneYearAgo) return null;
    // Show month label if this is the first week or if previous week was different month
    if (weekIndex === 0) {
      return format(firstDay, 'MMM');
    }
    const prevWeekFirstDay = weeks[weekIndex - 1]?.[0];
    if (prevWeekFirstDay && getMonth(prevWeekFirstDay) !== getMonth(firstDay)) {
      return format(firstDay, 'MMM');
    }
    return null;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Left Column: Stacked Today's Task and Streak */}
          <div className="flex flex-col gap-6 md:w-80 flex-shrink-0">
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
          </div>

          {/* Right Column: Activity Calendar & Forecast */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Activity Calendar</h3>
                <a 
                  href="/streak" 
                  className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
                >
                  View details →
                </a>
              </div>
              
              {/* GitHub-style yearly heatmap */}
              <div className="overflow-x-auto">
                <div className="inline-flex flex-col gap-1 min-w-max">
                  {/* Month labels row */}
                  <div className="flex gap-1 pl-6 mb-1">
                    {weeks.map((week, weekIdx) => {
                      const monthLabel = getMonthLabel(weekIdx);
                      return (
                        <div
                          key={weekIdx}
                          className="w-3 text-xs text-gray-500"
                          style={{ minWidth: '11px' }}
                        >
                          {monthLabel}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Calendar grid with day labels */}
                  <div className="flex gap-1">
                    {/* Day labels column */}
                    <div className="flex flex-col gap-1 justify-around text-xs text-gray-500 pr-2">
                      <span>Mon</span>
                      <span>Wed</span>
                      <span>Fri</span>
                    </div>
                    
                    {/* Weeks grid (each week is a column) */}
                    <div className="flex gap-1">
                      {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                          {week.map((date, dayIdx) => {
                            if (!date || date < oneYearAgo) {
                              return <div key={dayIdx} className="w-3 h-3" />;
                            }
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const count = activityMap.get(dateStr) || 0;
                            const color = getActivityColor(date);
                            const isCurrentDay = isToday(date);
                            
                            return (
                              <div
                                key={dayIdx}
                                className="w-3 h-3 rounded transition-all hover:ring-2 hover:ring-purple-400 hover:ring-offset-1 cursor-pointer"
                                style={{
                                  backgroundColor: color,
                                  border: isCurrentDay ? '2px solid #9333ea' : 'none',
                                }}
                                title={
                                  count > 0
                                    ? `${format(date, 'MMM d, yyyy')}: ${count} practice${count > 1 ? 's' : ''}`
                                    : `${format(date, 'MMM d, yyyy')}: No activity`
                                }
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-end gap-2 text-xs text-gray-500 mt-2">
                    <span>Less</span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((level) => {
                        const opacity = level === 0 ? 0.1 : 0.3 + (level / 4) * 0.7;
                        return (
                          <div
                            key={level}
                            className="w-3 h-3 rounded"
                            style={{
                              backgroundColor: level === 0 ? '#f3f4f6' : `rgba(147, 51, 234, ${opacity})`,
                            }}
                          />
                        );
                      })}
                    </div>
                    <span>More</span>
                  </div>
                </div>
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

