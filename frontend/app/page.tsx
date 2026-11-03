"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Mic,
  Flame,
  CalendarDays,
  Check,
  AudioLines,
  FileText,
} from "lucide-react";
import { format, subDays } from "date-fns";
import Sidebar from "@/components/Sidebar";
import PageHeader, { LoadingCards } from "@/components/PageHeader";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

type PartProgress = {
  part: number;
  completed_count: number;
  total_count: number;
};
type Activity = { date: string; practice_count: number };
type Dashboard = {
  daily: { practice_count: number; target_count: number };
  streak: { current_streak: number; longest_streak: number };
  parts: PartProgress[];
  activity: Activity[];
};

export default function Home() {
  const { user } = useAuthStore();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchProgress = useCallback(async () => {
    try {
      const [daily, streak, parts, activity] = await Promise.all([
        api.get("/api/progress/daily"),
        api.get("/api/progress/streak"),
        api.get("/api/progress/part-progress"),
        api.get("/api/progress/activity-calendar"),
      ]);
      setData({
        daily: daily.data,
        streak: streak.data,
        parts: parts.data,
        activity: activity.data,
      });
      setError("");
    } catch {
      setError("Chưa thể tải tiến độ. Hãy đăng nhập hoặc thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 30000);
    window.addEventListener("focus", fetchProgress);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchProgress);
    };
  }, [fetchProgress]);
  const target = data?.daily.target_count || 25;
  const count = data?.daily.practice_count || 0;
  const progress = Math.min(100, Math.max(0, (count / target) * 100));
  const activityMap = new Map(
    data?.activity.map((item) => [item.date, item.practice_count]) || [],
  );
  const days = Array.from({ length: 84 }, (_, index) =>
    subDays(new Date(), 83 - index),
  );
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div className="page-wrap">
          <PageHeader
            eyebrow="Mỗi ngày một bước tiến"
            title={`Chào ${user?.username || "bạn"}, cùng luyện nói nhé.`}
            description="Một câu trả lời hôm nay. Thêm một chút tự tin cho ngày mai."
            action={
              <Link href="/practice" className="btn-secondary">
                Bắt đầu luyện tập <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            }
          />
          {error && (
            <div
              role="alert"
              className="notice mb-6 flex flex-wrap items-center justify-between gap-3"
            >
              <span>{error}</span>
              <button
                onClick={fetchProgress}
                className="underline underline-offset-4"
              >
                Thử lại
              </button>
            </div>
          )}
          <section className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="relative overflow-hidden rounded-3xl bg-primary-900 p-6 text-white sm:p-9">
              <div className="mb-8 flex items-center gap-2 text-xs font-medium uppercase tracking-[.16em] text-primary-200">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-300" />
                Không gian luyện nói của bạn
              </div>
              <h2 className="max-w-lg text-3xl font-semibold leading-tight sm:text-4xl">
                Tự tin bắt đầu
                <br />
                từ việc cất lời.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-primary-100">
                Chọn một chủ đề, ghi âm câu trả lời và khám phá cách diễn đạt
                tốt hơn qua từng lần luyện.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/practice?part=1"
                  className="btn bg-white text-primary-900 hover:bg-primary-100"
                >
                  <Mic size={18} aria-hidden="true" />
                  Luyện nói ngay
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <span className="text-xs text-primary-200">
                  Theo nhịp độ của riêng bạn
                </span>
              </div>
              <div
                aria-hidden="true"
                className="absolute right-8 top-10 hidden items-center gap-1.5 opacity-30 xl:flex"
              >
                {[18, 32, 24, 50, 36, 62, 42, 24, 36].map((height, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-primary-200"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
            <div className="surface flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Mục tiêu hôm nay</h2>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <CalendarDays size={19} aria-hidden="true" />
                </span>
              </div>
              <div className="py-5">
                <p className="text-5xl font-semibold tracking-tight">
                  {data ? count : "—"}
                  <span className="ml-2 text-lg font-normal text-gray-500">
                    / {data ? target : "—"} lần
                  </span>
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  {data && count >= target
                    ? "Bạn đã đạt mục tiêu hôm nay. Thật đáng tự hào!"
                    : "Dành một khoảng nhỏ cho sự tiến bộ."}
                </p>
              </div>
              <div>
                <div
                  role="progressbar"
                  aria-label="Tiến độ mục tiêu hôm nay"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  className="h-2 overflow-hidden rounded-full bg-primary-50"
                >
                  <div
                    className="h-full rounded-full bg-primary-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  {data
                    ? `${Math.round(progress)}% mục tiêu đã hoàn thành`
                    : "Đăng nhập để theo dõi tiến độ"}
                </p>
              </div>
            </div>
          </section>
          {loading ? (
            <LoadingCards />
          ) : (
            <section
              aria-label="Tiến độ của bạn"
              className="mb-9 grid gap-4 sm:grid-cols-3"
            >
              {[
                {
                  label: "Chuỗi ngày luyện",
                  value: data?.streak.current_streak,
                  unit: "ngày",
                  icon: Flame,
                },
                {
                  label: "Chuỗi dài nhất",
                  value: data?.streak.longest_streak,
                  unit: "ngày",
                  icon: Check,
                },
                {
                  label: "Đã luyện trong 12 tuần",
                  value: data?.activity
                    .filter(
                      (item) => item.date >= format(days[0], "yyyy-MM-dd"),
                    )
                    .reduce((sum, item) => sum + item.practice_count, 0),
                  unit: "lần",
                  icon: Mic,
                },
              ].map(({ label, value, unit, icon: Icon }) => (
                <div key={label} className="surface flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs text-gray-600">{label}</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {value ?? "—"}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        {unit}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}
          <div className="mb-6 mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Chọn cách học phù hợp</p>
              <h2 className="text-2xl font-semibold">
                Hôm nay, bạn muốn luyện gì?
              </h2>
            </div>
          </div>
          <section className="mb-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "Luyện theo câu",
                text: "Tự chọn câu hỏi, tập trung vào điều bạn muốn cải thiện.",
                href: "/practice",
                label: "Khám phá câu hỏi",
                icon: Mic,
                num: "01",
              },
              {
                title: "Thi thử Speaking",
                text: "Thử sức với một bộ câu hỏi và theo dõi câu trả lời của bạn.",
                href: "/mock-test",
                label: "Bắt đầu thi thử",
                icon: FileText,
                num: "02",
              },
              {
                title: "Luyện phát âm",
                text: "Làm quen với các âm tiếng Anh, từng cặp âm một.",
                href: "/pronunciation",
                label: "Xem bài học",
                icon: AudioLines,
                num: "03",
              },
            ].map(({ title, text, href, label, icon: Icon, num }) => (
              <Link
                href={href}
                key={href}
                className="surface group transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                <div className="mb-7 flex items-center justify-between">
                  <Icon
                    size={24}
                    className="text-primary-700"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-gray-500">
                    {num}
                  </span>
                </div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mb-7 mt-3 text-sm leading-7 text-gray-600">
                  {text}
                </p>
                <span className="flex items-center justify-between text-sm font-semibold text-primary-800">
                  {label}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </section>
          <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="surface">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">Một thói quen nhỏ, mỗi ngày</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Hoạt động trong 12 tuần gần nhất
                  </p>
                </div>
                <Link
                  href="/streak"
                  className="text-xs font-semibold text-primary-800"
                >
                  Xem chi tiết{" "}
                  <ArrowUpRight
                    size={14}
                    className="inline"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <div className="overflow-x-auto pb-2">
                <div className="grid min-w-[350px] grid-flow-col grid-rows-7 gap-1.5">
                  {days.map((day) => {
                    const date = format(day, "yyyy-MM-dd");
                    const total = activityMap.get(date) || 0;
                    return (
                      <div
                        key={date}
                        role="img"
                        aria-label={`${format(day, "dd/MM")}: ${total} lần luyện`}
                        title={`${format(day, "dd/MM")}: ${total} lần luyện`}
                        className={`h-5 rounded-[4px] ${total > 5 ? "bg-primary-800" : total > 0 ? "bg-primary-400" : "bg-[#edf1eb]"}`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-gray-500">
                <span>Ít</span>
                <span className="h-2.5 w-2.5 rounded-sm bg-[#edf1eb]" />
                <span className="h-2.5 w-2.5 rounded-sm bg-primary-400" />
                <span className="h-2.5 w-2.5 rounded-sm bg-primary-800" />
                <span>Nhiều</span>
              </div>
            </div>
            <div className="surface">
              <h2 className="section-title mb-5">Hành trình theo từng phần</h2>
              <div className="space-y-5">
                {[1, 2, 3].map((part) => {
                  const item = data?.parts.find((item) => item.part === part);
                  const ratio = item?.total_count
                    ? Math.min(
                        100,
                        (item.completed_count / item.total_count) * 100,
                      )
                    : 0;
                  return (
                    <Link
                      key={part}
                      href={`/practice?part=${part}`}
                      className="block"
                    >
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium">Part {part}</span>
                        <span className="text-xs text-gray-500">
                          {item
                            ? `${item.completed_count} / ${item.total_count} câu`
                            : "Chưa có dữ liệu"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-primary-50">
                        <div
                          className="h-full rounded-full bg-primary-600"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
