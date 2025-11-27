'use client';

import Sidebar from '@/components/Sidebar';
import Image from 'next/image';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { pronunciationLessons } from '@/lib/pronunciationLessons';

type TabType = 'lessons' | 'history' | 'incorrect';

export default function PronunciationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('lessons');
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);

  // Show all consonants for the pronunciation course
  const consonantLessons = pronunciationLessons.filter(lesson => lesson.category === 'consonant');

  const toggleLesson = (lessonId: number) => {
    if (expandedLesson === lessonId) {
      setExpandedLesson(null);
    } else {
      setExpandedLesson(lessonId);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Khóa học Pronunciation cho band 0-5 Speaking
              </h1>
              <p className="text-gray-600">
                Luyện IPA và trọng âm của từ đơn
              </p>
            </div>
            <div className="relative w-16 h-16">
              <Image
                src="/logo.svg"
                alt="Pronunciation Logo"
                width={64}
                height={64}
                className="rounded-full"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'lessons'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Bài học
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'history'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Lịch sử luyện phát âm
            </button>
            <button
              onClick={() => setActiveTab('incorrect')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'incorrect'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Âm sai
            </button>
          </div>

          {/* Content */}
          {activeTab === 'lessons' && (
            <div className="space-y-3">
              {consonantLessons.map((lesson, index) => {
                const isExpanded = expandedLesson === lesson.id;
                return (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all"
                  >
                    {/* Lesson Header */}
                    <button
                      onClick={() => toggleLesson(lesson.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-medium">
                          Bài {index + 1}:
                        </span>
                        <span className="font-semibold text-gray-800">
                          Luyện âm {lesson.sound}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                      )}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Xem video hướng dẫn phát âm chính xác cho âm {lesson.sound}
                          </p>
                        </div>

                        {/* YouTube Video */}
                        <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-gray-100">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${lesson.youtubeId}`}
                            title={lesson.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          ></iframe>
                        </div>

                        {/* Video Link */}
                        <a
                          href={lesson.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          <Play size={16} />
                          <span>Xem trên YouTube</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              <p>Chưa có lịch sử luyện phát âm</p>
            </div>
          )}

          {activeTab === 'incorrect' && (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              <p>Chưa có âm sai nào được ghi nhận</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

