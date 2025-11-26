'use client';

import Sidebar from '@/components/Sidebar';
import { ChevronLeft, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay } from 'date-fns';
import api from '@/lib/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CalendarDay {
  date: string;
  has_activity: boolean;
  practice_count: number;
}

interface StreakAnalytics {
  current_streak: number;
  off_days: number;
  this_month: number;
  total_completions: number;
  calendar_days: CalendarDay[];
  yearly_heatmap: Array<{ date: string; practice_count: number }>;
  streak_history: Array<{ start_date: string; streak_length: number; is_active: boolean }>;
  weekly_pattern: Array<{ day_of_week: number; day_name: string; total_practice: number }>;
  monthly_progress: Array<{ month: string; year: number; total_practice: number }>;
  time_of_day: Array<{ period: string; total_practice: number }>;
}

export default function StreakPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [analytics, setAnalytics] = useState<StreakAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [currentDate]);

  // Refresh analytics when window gains focus (user might have practiced in another tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchAnalytics();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/progress/streak-analytics', {
        params: {
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
        },
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart); // 0 = Sunday

  // Add empty cells for days before month starts
  interface CalendarDayItem {
    date: Date;
    hasActivity: boolean;
    practiceCount: number;
  }
  
  const calendarDays: (CalendarDayItem | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  daysInMonth.forEach(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayData = analytics?.calendar_days.find(d => d.date === dayStr);
    calendarDays.push({
      date: day,
      hasActivity: dayData?.has_activity || false,
      practiceCount: dayData?.practice_count || 0,
    });
  });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <a href="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-2">
                <ArrowLeft size={18} />
                <span>Go Back</span>
              </a>
              <h1 className="text-3xl font-bold text-gray-800">Luyện Nói 🎤 (30m)</h1>
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Calendar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded">
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-lg font-semibold">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={index} className="aspect-square" />;
                    }
                    return (
                      <div
                        key={index}
                        className={`aspect-square flex items-center justify-center rounded text-sm ${
                          day.hasActivity
                            ? 'bg-purple-600 text-white font-bold'
                            : isToday(day.date)
                            ? 'bg-gray-200 font-medium text-gray-800'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                        title={day.hasActivity ? `${day.practiceCount} practices` : 'No activity'}
                      >
                        {day.hasActivity ? (
                          <span className="text-lg">✕</span>
                        ) : (
                          format(day.date, 'd')
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Statistics and Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <p className="text-sm text-gray-500 mb-1">Current Streak</p>
                  <p className="text-2xl font-bold">{analytics?.current_streak || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <p className="text-sm text-gray-500 mb-1">Off Days</p>
                  <p className="text-2xl font-bold">{analytics?.off_days || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <p className="text-sm text-gray-500 mb-1">This Month</p>
                  <p className="text-2xl font-bold">{analytics?.this_month || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <p className="text-sm text-gray-500 mb-1">Total Completions</p>
                  <p className="text-2xl font-bold">{analytics?.total_completions || 0}</p>
                </div>
              </div>

              {/* Yearly Heatmap */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Yearly Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Jan</span>
                    <div className="flex-1 flex gap-0.5 flex-wrap">
                      {Array.from({ length: 52 }).map((_, i) => {
                        const weekStart = i * 7;
                        const weekData = analytics?.yearly_heatmap.slice(weekStart, weekStart + 7) || [];
                        const maxCount = Math.max(...weekData.map(d => d.practice_count || 0), 0);
                        const intensity = maxCount > 0 ? Math.min(maxCount / 10, 1) : 0;
                        return (
                          <div
                            key={i}
                            className={`h-3 w-3 rounded ${
                              intensity > 0
                                ? `bg-purple-${Math.min(600 + Math.floor(intensity * 400), 900)}`
                                : 'bg-gray-200'
                            }`}
                            style={{
                              backgroundColor: intensity > 0 
                                ? `rgba(147, 51, 234, ${0.3 + intensity * 0.7})`
                                : '#e5e7eb'
                            }}
                            title={`Week ${i + 1}: ${maxCount} practices`}
                          />
                        );
                      })}
                    </div>
                    <span>Dec</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Less</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(level => (
                        <div
                          key={level}
                          className="h-3 w-3 rounded"
                          style={{
                            backgroundColor: `rgba(147, 51, 234, ${0.3 + level * 0.15})`,
                          }}
                        />
                      ))}
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Streak History */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-sm font-semibold mb-4">Streak History</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics?.streak_history.map(item => ({
                      ...item,
                      date: format(new Date(item.start_date), 'MMM d')
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="streak_length" fill="#9333ea" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly Pattern */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-sm font-semibold mb-4">Weekly Pattern</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics?.weekly_pattern || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day_name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total_practice" stroke="#9333ea" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Progress */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-sm font-semibold mb-4">Monthly Progress</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics?.monthly_progress.map(item => ({
                      ...item,
                      label: `${item.month.substring(0, 3)} ${item.year}`
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total_practice" stroke="#9333ea" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Time of Day */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-sm font-semibold mb-4">Time of Day</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics?.time_of_day || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total_practice" stroke="#9333ea" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

