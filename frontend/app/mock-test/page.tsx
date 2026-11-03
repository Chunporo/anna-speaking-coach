"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import PageHeader, { EmptyState, LoadingCards } from "@/components/PageHeader";
import {
  FileText,
  ArrowUpRight,
  ArrowRight,
  Layers,
  Loader2,
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface MockTest {
  id: number;
  test_type: string;
  created_at: string;
  feedback: string | null;
  fluency_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  pronunciation_score: number | null;
}
const options = [
  {
    type: "PART1",
    title: "Làm quen & chia sẻ",
    part: "Part 1",
    description: "Bắt đầu với những câu hỏi gần gũi về cuộc sống hàng ngày.",
    detail: "Tối đa 3 câu hỏi",
  },
  {
    type: "PART2",
    title: "Kể câu chuyện của bạn",
    part: "Part 2",
    description: "Sắp xếp ý tưởng và trình bày về một chủ đề cụ thể.",
    detail: "1 chủ đề trình bày",
  },
  {
    type: "PART3",
    title: "Đi sâu vào ý tưởng",
    part: "Part 3",
    description: "Mở rộng quan điểm, giải thích và thảo luận sâu hơn.",
    detail: "Tối đa 3 câu hỏi",
  },
  {
    type: "FULL",
    title: "Trọn hành trình Speaking",
    part: "Full test",
    description: "Kết nối cả ba phần trong một phiên luyện tập.",
    detail: "Part 1, 2 và 3",
  },
];
function MockTestContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api
      .get("/api/mock-test/")
      .then((response) => {
        if (active) setTests(response.data);
      })
      .catch(() => {
        if (active)
          setError("Chưa thể tải lịch sử. Vui lòng đăng nhập hoặc thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const start = async (type: string) => {
    if (starting) return;
    setStarting(type);
    setError("");
    try {
      const response = await api.post("/api/mock-test/", { test_type: type });
      router.push(`/mock-test/${response.data.id}`);
    } catch {
      setError("Chưa thể bắt đầu bài thi. Vui lòng đăng nhập và thử lại.");
      setStarting(null);
    }
  };
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div className="page-wrap">
          <PageHeader
            eyebrow="Thử sức, khám phá, tiến bộ"
            title="Sẵn sàng cho lần thi thử tiếp theo?"
            description="Luyện từng phần hoặc thử một phiên đầy đủ. Chọn trải nghiệm phù hợp với thời gian và mục tiêu của bạn."
          />
          {error && (
            <p role="alert" className="notice mb-6">
              {error}
            </p>
          )}
          <section
            aria-label="Chọn phần thi"
            className="grid gap-4 sm:grid-cols-2"
          >
            {options.map((option) => (
              <article
                key={option.type}
                className={`surface flex flex-col ${option.type === "FULL" ? "!border-primary-300 !bg-primary-50" : ""}`}
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="badge">{option.part}</span>
                  {option.type === "FULL" ? (
                    <Layers
                      size={21}
                      className="text-primary-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText
                      size={21}
                      className="text-primary-700"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h2 className="text-xl font-semibold">{option.title}</h2>
                <p className="mb-6 mt-3 flex-1 text-sm leading-7 text-gray-600">
                  {option.description}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                  <span className="text-xs text-gray-500">{option.detail}</span>
                  <button
                    disabled={starting !== null}
                    aria-label={`Bắt đầu ${option.part}`}
                    onClick={() => start(option.type)}
                    className={
                      option.type === params.get("type") ||
                      option.type === "FULL"
                        ? "btn-primary"
                        : "btn-secondary"
                    }
                  >
                    {starting === option.type ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                        Đang chuẩn bị…
                      </>
                    ) : (
                      <>
                        Bắt đầu
                        <ArrowRight size={16} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </section>
          <p className="my-5 text-xs leading-6 text-gray-500">
            Luyện tập theo nhịp độ riêng, không giới hạn thời gian thi. Điểm
            phản hồi là ước tính từ bản ghi văn bản, không phải kết quả IELTS
            chính thức.
          </p>
          <section className="mt-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Những lần bạn đã thử sức
              </h2>
              <span className="text-xs text-gray-500">
                {tests.length} bài thi
              </span>
            </div>
            {loading ? (
              <LoadingCards />
            ) : tests.length === 0 ? (
              <EmptyState
                title="Hành trình thi thử bắt đầu ở đây"
                description="Chọn một phần thi phía trên. Lịch sử của bạn sẽ được lưu để tiếp tục và nhìn lại."
              />
            ) : (
              <div className="space-y-3">
                {tests.map((test) => (
                  <Link
                    key={test.id}
                    href={`/mock-test/${test.id}`}
                    className="surface flex flex-wrap items-center justify-between gap-5 transition-colors hover:border-primary-300"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                        <FileText size={20} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-semibold">
                          {test.test_type === "FULL"
                            ? "Full test"
                            : test.test_type.replace("PART", "Part ")}{" "}
                          <span className="font-normal text-gray-500">
                            · #{test.id}
                          </span>
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(test.created_at).toLocaleDateString(
                            "vi-VN",
                            { day: "numeric", month: "long", year: "numeric" },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-5">
                      <span className="text-xs text-gray-600">
                        {test.feedback === "Completed"
                          ? "Đã hoàn thành"
                          : test.feedback || "Sẵn sàng để tiếp tục"}
                      </span>
                      {(test.feedback === "Completed" ||
                        test.fluency_score != null) && (
                        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                          {(
                            [
                              ["fluency_score", "Trôi chảy"],
                              ["vocabulary_score", "Từ vựng"],
                              ["grammar_score", "Ngữ pháp"],
                              ["pronunciation_score", "Phát âm"],
                            ] as const
                          ).map(([key, label]) => (
                            <div key={key}>
                              <dt className="text-xs text-gray-500">{label}</dt>
                              <dd className="mt-1 text-sm font-semibold">
                                {test[key] == null
                                  ? "—"
                                  : Number(test[key]).toFixed(1)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <ArrowUpRight
                        size={18}
                        className="text-primary-700"
                        aria-label="Mở bài thi"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
export default function MockTestPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          Đang tải bài thi…
        </p>
      }
    >
      <MockTestContent />
    </Suspense>
  );
}
