"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, AudioLines, ArrowUpRight } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { pronunciationLessons } from "@/lib/pronunciationLessons";

export default function PronunciationPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div className="page-wrap">
          <PageHeader
            eyebrow="Lắng nghe từng âm nhỏ"
            title="Nói rõ hơn, tự tin hơn."
            description="Khám phá các cặp phụ âm tiếng Anh. Chú ý vị trí lưỡi, luồng hơi và cảm nhận sự khác biệt khi đọc thành tiếng."
          />
          <div className="mb-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl bg-primary-900 p-7 text-white">
              <AudioLines
                size={30}
                className="mb-5 text-primary-200"
                aria-hidden="true"
              />
              <h2 className="text-2xl font-semibold">
                Đọc chậm. Cảm nhận. Thử lại.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-primary-100">
                Bắt đầu với một cặp âm, đọc từng từ mẫu rồi ghép chúng vào câu
                của bạn. Không cần vội vàng.
              </p>
            </div>
            <div className="surface">
              <p className="eyebrow">Cách luyện tập</p>
              <ol className="space-y-4 text-sm text-gray-600">
                {[
                  "Đọc hướng dẫn và thử vị trí phát âm.",
                  "Đọc chậm từng cặp từ mẫu.",
                  "Đặt một câu ngắn với mỗi từ.",
                ].map((text, index) => (
                  <li key={text} className="flex gap-3">
                    <span className="font-semibold text-primary-700">
                      0{index + 1}
                    </span>
                    {text}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Khám phá phụ âm</h2>
            <span className="text-xs text-gray-500">
              {pronunciationLessons.length} bài học
            </span>
          </div>
          <div className="space-y-3">
            {pronunciationLessons.map((lesson, index) => {
              const open = expanded === lesson.id;
              return (
                <section
                  key={lesson.id}
                  className="overflow-hidden rounded-2xl border bg-white"
                >
                  <h3>
                    <button
                      id={`lesson-${lesson.id}`}
                      aria-expanded={open}
                      aria-controls={`lesson-content-${lesson.id}`}
                      onClick={() => setExpanded(open ? null : lesson.id)}
                      className="flex min-h-[84px] w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-primary-50 sm:px-7"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-semibold text-primary-700">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-semibold">
                          {lesson.sound}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-gray-500">
                          {lesson.title}
                        </span>
                      </span>
                      <ChevronDown
                        size={19}
                        aria-hidden="true"
                        className={`shrink-0 text-primary-700 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                  </h3>
                  <div
                    id={`lesson-content-${lesson.id}`}
                    role="region"
                    aria-labelledby={`lesson-${lesson.id}`}
                    hidden={!open}
                    className="border-t px-5 py-6 sm:px-7"
                  >
                    <p className="max-w-3xl text-sm leading-8 text-gray-600">
                      {lesson.guidance}
                    </p>
                    <div className="mt-5 rounded-xl bg-[#f7f8f4] p-5">
                      <p className="eyebrow">Thử đọc thành tiếng</p>
                      <p lang="en" className="text-lg font-medium leading-8">
                        {lesson.examples}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6">
            <p className="text-sm text-gray-600">
              Sẵn sàng áp dụng vào câu trả lời của bạn?
            </p>
            <Link href="/practice" className="btn-secondary">
              Luyện nói theo câu
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
