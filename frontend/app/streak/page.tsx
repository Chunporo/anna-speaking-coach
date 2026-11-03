"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Flame,
  Check,
  Mic,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  subDays,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import Sidebar from "@/components/Sidebar";
import PageHeader, { EmptyState, LoadingCards } from "@/components/PageHeader";
import api from "@/lib/api";

interface Analytics {
  current_streak: number;
  off_days: number;
  this_month: number;
  total_completions: number;
  calendar_days: {
    date: string;
    has_activity: boolean;
    practice_count: number;
  }[];
  yearly_heatmap: { date: string; practice_count: number }[];
  streak_history: {
    start_date: string;
    streak_length: number;
    is_active: boolean;
  }[];
  weekly_pattern: {
    day_of_week: number;
    day_name: string;
    total_practice: number;
  }[];
  monthly_progress: { month: string; year: number; total_practice: number }[];
  time_of_day: { period: string; total_practice: number }[];
}
const periodNames: Record<string, string> = {
  Morning: "Buổi sáng",
  Afternoon: "Buổi chiều",
  Evening: "Buổi tối",
  Night: "Ban đêm",
};
export default function StreakPage() {
  const [month, setMonth] = useState(new Date());
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const result = await api.get("/api/progress/streak-analytics", {
        params: { year: month.getFullYear(), month: month.getMonth() + 1 },
      });
      if (request === sequence.current) {
        setData(result.data);
        setError("");
      }
    } catch {
      if (request === sequence.current)
        setError("Chưa thể tải tiến độ. Vui lòng đăng nhập hoặc thử lại.");
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    return () => {
      sequence.current++;
      window.removeEventListener("focus", load);
    };
  }, [load]);
  const cells = [
    ...Array.from({ length: getDay(startOfMonth(month)) }, () => null),
    ...eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    }),
  ];
  const activity = new Map(
    data?.yearly_heatmap.map((item) => [item.date, item.practice_count]) || [],
  );
  const calendar = new Map(
    data?.calendar_days.map((item) => [item.date, item.practice_count]) || [],
  );
  const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const week =
    data?.weekly_pattern.map((item) => ({
      ...item,
      label: labels[item.day_of_week],
    })) || [];
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div className="page-wrap">
          <PageHeader
            eyebrow="Nhìn lại để tiến xa hơn"
            title="Mỗi lần luyện đều đáng ghi nhận."
            description="Theo dõi thói quen, nhìn lại những ngày đã luyện và tiếp tục hành trình của bạn."
            action={
              <button
                className="btn-secondary"
                disabled={loading}
                onClick={() => load()}
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                Làm mới
              </button>
            }
          />
          {error && (
            <p role="alert" className="notice mb-6">
              {error}
            </p>
          )}
          {loading && !data ? (
            <LoadingCards />
          ) : !data ? (
            <EmptyState
              title="Chưa có dữ liệu tiến độ"
              description="Đăng nhập và hoàn thành một câu trả lời để bắt đầu lưu lại hành trình."
            />
          ) : (
            <>
              <section
                aria-label="Tổng quan tiến độ"
                className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
              >
                {[
                  {
                    label: "Chuỗi ngày hiện tại",
                    value: data.current_streak,
                    unit: "ngày",
                    icon: Flame,
                  },
                  {
                    label: "Trong tháng đã chọn",
                    value: data.this_month,
                    unit: "lần",
                    icon: CalendarDays,
                  },
                  {
                    label: "Tổng lần hoàn thành",
                    value: data.total_completions,
                    unit: "lần",
                    icon: Check,
                  },
                  {
                    label: "Ngày nghỉ gần đây",
                    value: data.off_days,
                    unit: "ngày",
                    icon: Mic,
                  },
                ].map(({ label, value, unit, icon: Icon }) => (
                  <div key={label} className="surface !p-4 sm:!p-6">
                    <Icon
                      size={19}
                      className="mb-4 text-primary-700"
                      aria-hidden="true"
                    />
                    <p className="mb-2 text-xs text-gray-600">{label}</p>
                    <p className="text-3xl font-semibold">
                      {value}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {unit}
                      </span>
                    </p>
                  </div>
                ))}
              </section>
              <div className="mb-6 grid items-start gap-6 lg:grid-cols-[.9fr_1.5fr]">
                <section className="surface">
                  <div className="mb-6 flex items-center justify-between gap-2">
                    <h2 className="section-title capitalize">
                      {format(month, "MMMM yyyy", { locale: vi })}
                    </h2>
                    <div className="flex gap-1">
                      <button
                        className="icon-button"
                        aria-label="Tháng trước"
                        onClick={() =>
                          setMonth(
                            new Date(
                              month.getFullYear(),
                              month.getMonth() - 1,
                              1,
                            ),
                          )
                        }
                      >
                        <ChevronLeft size={17} aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Tháng sau"
                        onClick={() =>
                          setMonth(
                            new Date(
                              month.getFullYear(),
                              month.getMonth() + 1,
                              1,
                            ),
                          )
                        }
                      >
                        <ChevronRight size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {labels.map((day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs text-gray-500"
                      >
                        {day}
                      </div>
                    ))}
                    {cells.map((day, index) => {
                      if (!day) return <div key={`blank-${index}`} />;
                      const count =
                        calendar.get(format(day, "yyyy-MM-dd")) || 0;
                      return (
                        <div
                          key={day.toISOString()}
                          role="img"
                          aria-label={`${format(day, "dd/MM")}: ${count} lần luyện`}
                          title={`${count} lần luyện`}
                          className={`relative flex aspect-square items-center justify-center rounded-xl text-sm ${count > 0 ? "bg-primary-700 font-semibold text-white" : isToday(day) ? "border border-primary-700 bg-primary-50 font-semibold text-primary-900" : "text-gray-600"}`}
                        >
                          {format(day, "d")}
                          {count > 0 && (
                            <span
                              aria-hidden="true"
                              className="absolute bottom-1 h-1 w-1 rounded-full bg-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-5 text-xs leading-6 text-gray-500">
                    Các ngày có chấm đánh dấu là ngày bạn đã hoàn thành bản ghi.
                  </p>
                  {loading && (
                    <p role="status" className="text-xs text-primary-700">
                      Đang cập nhật tháng…
                    </p>
                  )}
                </section>
                <section className="surface min-w-0">
                  <h2 className="section-title">Nhịp luyện tập trong tuần</h2>
                  <p className="mb-6 mt-1 text-xs text-gray-500">
                    Tổng số lần luyện theo thứ trong tuần
                  </p>
                  <div className="h-60 min-w-0" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={week}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e4eae3"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [value, "Lần luyện"]}
                        />
                        <Bar
                          dataKey="total_practice"
                          fill="#176b55"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-4 text-xs text-gray-600">
                    <summary className="min-h-[44px] cursor-pointer py-3">
                      Xem dữ liệu dạng bảng
                    </summary>
                    <table className="w-full text-left">
                      <caption className="sr-only">Lần luyện theo thứ</caption>
                      <thead>
                        <tr>
                          <th scope="col">Thứ</th>
                          <th scope="col">Lần luyện</th>
                        </tr>
                      </thead>
                      <tbody>
                        {week.map((item) => (
                          <tr key={item.day_of_week}>
                            <th scope="row" className="py-2 font-normal">
                              {item.label}
                            </th>
                            <td>{item.total_practice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </section>
              </div>
              <section className="surface mb-6">
                <div className="mb-6">
                  <h2 className="section-title">Một năm của những bước tiến</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    365 ngày gần nhất · di chuyển ngang để khám phá
                  </p>
                </div>
                <div className="overflow-x-auto pb-3">
                  <div className="grid min-w-[680px] grid-flow-col grid-rows-7 gap-1.5">
                    {Array.from({ length: 365 }, (_, i) =>
                      subDays(new Date(), 364 - i),
                    ).map((day) => {
                      const date = format(day, "yyyy-MM-dd");
                      const count = activity.get(date) || 0;
                      return (
                        <span
                          key={date}
                          role="img"
                          aria-label={`${format(day, "dd/MM/yyyy")}: ${count} lần luyện`}
                          title={`${format(day, "dd/MM")}: ${count} lần luyện`}
                          className={`h-3 rounded-[3px] ${count > 5 ? "bg-primary-800" : count > 0 ? "bg-primary-400" : "bg-[#edf1eb]"}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
              <section className="surface min-w-0">
                <h2 className="section-title">Tiến bộ theo tháng</h2>
                <p className="mb-6 mt-1 text-xs text-gray-500">
                  Tổng số câu trả lời đã hoàn thành trong 12 tháng
                </p>
                <div className="h-64 min-w-0" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthly_progress}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e4eae3"
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [value, "Lần luyện"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_practice"
                        stroke="#176b55"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details className="mt-3 text-xs text-gray-600">
                  <summary className="min-h-[44px] cursor-pointer py-3">
                    Xem dữ liệu theo tháng
                  </summary>
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th scope="col">Tháng</th>
                        <th scope="col">Lần luyện</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly_progress.map((item, index) => (
                        <tr key={index}>
                          <th scope="row" className="py-2 font-normal">
                            {item.month} {item.year}
                          </th>
                          <td>{item.total_practice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>
              <section className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="surface">
                  <h2 className="section-title mb-5">
                    Những chuỗi ngày đáng nhớ
                  </h2>
                  {data.streak_history.length ? (
                    data.streak_history.map((item) => (
                      <div
                        key={item.start_date}
                        className="flex justify-between gap-4 border-b py-3 text-sm last:border-0"
                      >
                        <span className="text-gray-600">
                          Từ {item.start_date.split("-").reverse().join("/")}
                        </span>
                        <span className="font-medium">
                          {item.streak_length} ngày{" "}
                          {item.is_active && (
                            <span className="text-primary-700">
                              · Đang tiếp tục
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-gray-500">
                      Hoàn thành bản ghi đầu tiên để bắt đầu một chuỗi ngày mới.
                    </p>
                  )}
                </div>
                <div className="surface">
                  <h2 className="section-title mb-2">
                    Thời điểm bạn luyện tập
                  </h2>
                  <p className="mb-5 text-xs text-gray-500">
                    Các khung giờ theo UTC
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {data.time_of_day.map((item) => (
                      <div
                        key={item.period}
                        className="rounded-xl bg-[#f7f8f4] p-4"
                      >
                        <p className="text-xs text-gray-600">
                          {periodNames[item.period] || item.period}
                        </p>
                        <p className="mt-2 text-xl font-semibold">
                          {item.total_practice}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            lần
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
