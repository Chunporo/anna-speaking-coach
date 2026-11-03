"use client";

import Link from "next/link";
import {
  Mic,
  Search,
  Eye,
  EyeOff,
  ArrowUpRight,
  Plus,
  Check,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader, { EmptyState, LoadingCards } from "@/components/PageHeader";
import api from "@/lib/api";

interface Question {
  id: number;
  part: number;
  topic: string | null;
  question_text: string;
}
interface HistoryItem {
  question_id: number | null;
  user_question_id: number | null;
  audio_url: string | null;
}

function PracticeContent() {
  const params = useSearchParams();
  const requested = Number(params.get("part") || 1);
  const part = [1, 2, 3].includes(requested) ? requested : 1;
  const custom = params.get("custom") === "true";
  const [activeTab, setActiveTab] = useState(custom ? 0 : part);
  const [hideAnswered, setHideAnswered] = useState(false);
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ part: 1, topic: "", question_text: "" });
  const sequence = useRef(0);
  useEffect(() => {
    setActiveTab(custom ? 0 : part);
  }, [custom, part]);
  const fetchQuestions = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const [result, history] = await Promise.allSettled([
        api.get(
          activeTab === 0 ? "/api/questions/user-questions" : "/api/questions",
          { params: activeTab === 0 ? {} : { part: activeTab } },
        ),
        api.get<HistoryItem[]>("/api/practice/"),
      ]);
      if (request !== sequence.current) return;
      if (result.status === "rejected") throw result.reason;
      setQuestions(result.value.data);
      setAnswered(
        new Set(
          history.status === "fulfilled"
            ? history.value.data
                .filter((item) => item.audio_url)
                .map((item) =>
                  activeTab === 0 ? item.user_question_id : item.question_id,
                )
                .filter((id): id is number => id !== null)
            : [],
        ),
      );
    } catch {
      if (request === sequence.current) {
        setQuestions([]);
        setError("Không thể tải câu hỏi. Vui lòng đăng nhập hoặc thử lại.");
      }
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [activeTab]);
  useEffect(() => {
    fetchQuestions();
    return () => {
      sequence.current++;
    };
  }, [fetchQuestions]);
  const createQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/api/questions/user-questions", {
        ...draft,
        question_text: draft.question_text.trim(),
      });
      setDraft({ part: 1, topic: "", question_text: "" });
      setShowForm(false);
      await fetchQuestions();
    } catch {
      setError(
        "Chưa thể lưu câu hỏi. Nội dung của bạn vẫn được giữ lại để thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };
  const filtered = questions.filter(
    (q) =>
      (!hideAnswered || !answered.has(q.id)) &&
      `${q.question_text} ${q.topic || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const grouped = filtered.reduce(
    (groups, q) => {
      const topic = q.topic || "Câu hỏi của bạn";
      (groups[topic] ||= []).push(q);
      return groups;
    },
    {} as Record<string, Question[]>,
  );
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div className="page-wrap">
          <PageHeader
            eyebrow="Luyện theo nhịp của bạn"
            title="Mỗi câu hỏi, một cơ hội tiến bộ."
            description="Chọn chủ đề bạn thích. Ghi âm, nghe lại và thử một cách diễn đạt mới."
            action={
              <button
                onClick={() => {
                  setActiveTab(0);
                  setShowForm(true);
                }}
                className="btn-secondary"
              >
                <Plus size={17} aria-hidden="true" />
                Thêm câu hỏi
              </button>
            }
          />
          <div
            role="tablist"
            aria-label="Phần luyện tập"
            className="mb-6 flex flex-wrap gap-2 border-b pb-4"
          >
            {[
              { id: 1, label: "Part 1", note: "Làm quen" },
              { id: 2, label: "Part 2", note: "Trình bày" },
              { id: 3, label: "Part 3", note: "Thảo luận" },
              { id: 0, label: "Câu hỏi của bạn", note: "" },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`part-tab-${tab.id}`}
                role="tab"
                tabIndex={activeTab === tab.id ? 0 : -1}
                onKeyDown={(event) => {
                  const order = [1, 2, 3, 0];
                  const index = order.indexOf(tab.id);
                  const next =
                    event.key === "ArrowRight"
                      ? order[(index + 1) % 4]
                      : event.key === "ArrowLeft"
                        ? order[(index + 3) % 4]
                        : event.key === "Home"
                          ? 1
                          : event.key === "End"
                            ? 0
                            : null;
                  if (next !== null) {
                    event.preventDefault();
                    setActiveTab(next);
                    document.getElementById(`part-tab-${next}`)?.focus();
                  }
                }}
                aria-selected={activeTab === tab.id}
                aria-controls="questions-panel"
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowForm(false);
                }}
                className={`min-h-[48px] rounded-xl px-4 py-3 text-sm transition-colors ${activeTab === tab.id ? "bg-primary-800 text-white" : "text-gray-600 hover:bg-primary-50"}`}
              >
                <span className="font-semibold">{tab.label}</span>
                {tab.note && (
                  <span
                    className={`ml-2 hidden text-xs sm:inline ${activeTab === tab.id ? "text-primary-100" : "text-gray-500"}`}
                  >
                    {tab.note}
                  </span>
                )}
              </button>
            ))}
          </div>
          <section
            id="questions-panel"
            role="tabpanel"
            aria-labelledby={`part-tab-${activeTab}`}
          >
            {error && (
              <div role="alert" className="notice mb-5">
                {error}
              </div>
            )}
            {activeTab === 0 && showForm && (
              <form onSubmit={createQuestion} className="surface mb-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="section-title">Câu hỏi theo cách của bạn</h2>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="icon-button"
                    aria-label="Đóng biểu mẫu"
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <label>
                    <span className="field-label">Phần thi</span>
                    <select
                      value={draft.part}
                      onChange={(e) =>
                        setDraft({ ...draft, part: Number(e.target.value) })
                      }
                      className="field"
                    >
                      {[1, 2, 3].map((part) => (
                        <option key={part} value={part}>
                          Part {part}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">
                      Chủ đề{" "}
                      <span className="font-normal text-gray-500">
                        (tùy chọn)
                      </span>
                    </span>
                    <input
                      value={draft.topic}
                      onChange={(e) =>
                        setDraft({ ...draft, topic: e.target.value })
                      }
                      maxLength={100}
                      className="field"
                    />
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="field-label">Nội dung câu hỏi</span>
                  <textarea
                    required
                    maxLength={5000}
                    rows={3}
                    value={draft.question_text}
                    onChange={(e) =>
                      setDraft({ ...draft, question_text: e.target.value })
                    }
                    className="field"
                    placeholder="What is something you would love to learn?"
                  />
                </label>
                <div className="mt-5 flex justify-end">
                  <button
                    disabled={saving || !draft.question_text.trim()}
                    className="btn-primary"
                  >
                    {saving ? "Đang lưu…" : "Lưu câu hỏi"}
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
              </form>
            )}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <label className="relative min-w-[180px] flex-1">
                <Search
                  size={18}
                  aria-hidden="true"
                  className="absolute left-4 top-3.5 text-gray-500"
                />
                <span className="sr-only">Tìm câu hỏi hoặc chủ đề</span>
                <input
                  type="search"
                  className="field pl-11"
                  placeholder="Tìm câu hỏi hoặc chủ đề…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button
                aria-pressed={hideAnswered}
                onClick={() => setHideAnswered(!hideAnswered)}
                className={
                  hideAnswered
                    ? "btn bg-primary-100 text-primary-900"
                    : "btn-secondary"
                }
              >
                {hideAnswered ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
                Ẩn câu đã luyện
              </button>
            </div>
            <p aria-live="polite" className="mb-5 text-xs text-gray-500">
              {loading
                ? "Đang tìm câu hỏi…"
                : `${filtered.length} câu hỏi · ${Object.keys(grouped).length} chủ đề`}
            </p>
            {loading ? (
              <LoadingCards />
            ) : filtered.length === 0 ? (
              <EmptyState
                title={
                  activeTab === 0 && !search
                    ? "Không gian cho những câu hỏi của bạn"
                    : "Chưa tìm thấy câu hỏi phù hợp"
                }
                description={
                  activeTab === 0 && !search
                    ? "Thêm một câu hỏi về điều bạn yêu thích để bắt đầu luyện nói."
                    : "Thử một từ khóa khác hoặc hiển thị lại những câu đã luyện."
                }
                action={
                  activeTab === 0 ? (
                    <button
                      className="btn-primary"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Thêm câu hỏi đầu tiên
                    </button>
                  ) : (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setSearch("");
                        setHideAnswered(false);
                      }}
                    >
                      Xóa bộ lọc
                    </button>
                  )
                }
              />
            ) : (
              <div className="space-y-5">
                {Object.entries(grouped).map(([topic, items]) => (
                  <article key={topic} className="surface">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="section-title">{topic}</h2>
                      <span className="text-xs text-gray-500">
                        {items.length} câu hỏi
                      </span>
                    </div>
                    <div className="divide-y">
                      {items.map((q) => (
                        <div
                          key={q.id}
                          className="flex flex-col items-start gap-4 py-5 sm:flex-row sm:items-center"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${answered.has(q.id) ? "bg-primary-50 text-primary-700" : "bg-[#f7f8f4] text-gray-500"}`}
                          >
                            {answered.has(q.id) ? (
                              <Check size={17} aria-label="Đã luyện" />
                            ) : (
                              <Mic size={16} aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p lang="en" className="font-medium leading-7">
                              {q.question_text}
                            </p>
                            {activeTab === 0 && (
                              <p className="mt-1 text-xs text-gray-500">
                                Part {q.part}
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/practice/${q.id}${activeTab === 0 ? "?custom=true" : ""}`}
                            className="btn-secondary shrink-0"
                          >
                            Luyện ngay
                            <ArrowUpRight size={16} aria-hidden="true" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          Đang tải câu hỏi…
        </p>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
