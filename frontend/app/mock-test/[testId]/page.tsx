"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader, { EmptyState, LoadingCards } from "@/components/PageHeader";
import api from "@/lib/api";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { usePracticeSubmission } from "@/hooks/usePracticeSubmission";
import { Question, PracticeSession } from "@/lib/types";

type TestQuestion = {
  question_id: number;
  part: number;
  question_text: string;
  answered: boolean;
};
export default function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const recorder = useAudioRecorder();
  const submission = usePracticeSubmission();
  const load = useCallback(async () => {
    const response = await api.get(`/api/mock-test/${testId}/questions`);
    setQuestions(response.data);
    setLoaded(true);
  }, [testId]);
  useEffect(() => {
    load().catch((error) => {
      setLoaded(true);
      setError(
        error.response?.data?.detail ||
          "Không thể tải bài thi. Vui lòng đăng nhập và thử lại.",
      );
    });
  }, [load]);
  const question = questions.find((item) => !item.answered);
  const completed = questions.filter((item) => item.answered).length;
  const saveAnswer = async (session: PracticeSession) => {
    if (!question) return;
    await api.post(
      `/api/mock-test/${testId}/answers/${question.question_id}`,
      { session_id: session.id },
    );
    recorder.resetRecording();
    submission.clearLastSubmission();
    await load();
  };
  const submit = async () => {
    if (!question || !recorder.audioBlob) return;
    setError("");
    try {
      if (submission.lastSubmission) {
        await saveAnswer(submission.lastSubmission);
      } else {
        await submission.submitRecording(
          recorder.audioBlob,
          {
            id: question.question_id,
            part: question.part,
            question_text: question.question_text,
          } as Question,
          saveAnswer,
        );
      }
    } catch {
      setError(
        "Chưa thể lưu câu trả lời. Bản ghi vẫn được giữ lại để thử lại.",
      );
    }
  };
  const clock = `${Math.floor(recorder.recordingTime / 60)
    .toString()
    .padStart(
      2,
      "0",
    )}:${(recorder.recordingTime % 60).toString().padStart(2, "0")}`;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div className="page-wrap">
          <PageHeader
            eyebrow={`Thi thử · #${testId}`}
            title="Tập trung vào câu trả lời của bạn."
            description="Không cần vội. Bạn có thể nghe lại bản ghi trước khi tiếp tục."
            action={
              <Link href="/mock-test" className="btn-secondary">
                Quay lại bài thi
              </Link>
            }
          />
          {(error || recorder.error || submission.error) && (
            <p role="alert" className="notice mb-6">
              {error || recorder.error || submission.error}
            </p>
          )}
          {!loaded ? (
            <LoadingCards />
          ) : !questions.length ? (
            <EmptyState
              title="Chưa thể mở bài thi này"
              description="Quay lại để chọn một bài thi mới hoặc đăng nhập vào tài khoản của bạn."
              action={
                <Link href="/mock-test" className="btn-primary">
                  Chọn bài thi
                </Link>
              }
            />
          ) : !question ? (
            <div className="surface py-14 text-center">
              <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <Check size={30} aria-hidden="true" />
              </span>
              <p className="eyebrow">Một bước tiến nữa</p>
              <h2 className="text-3xl font-semibold">
                Bạn đã hoàn thành phiên thi thử.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-gray-600">
                Câu trả lời của bạn đã được lưu. Điểm ước tính xuất hiện khi tất
                cả câu trả lời được phân tích thành công.
              </p>
              <Link href="/mock-test" className="btn-primary mt-7">
                Xem lịch sử bài thi
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <ol
                  aria-label="Tiến độ bài thi"
                  className="flex flex-wrap gap-2"
                >
                  {questions.map((item, index) => (
                    <li
                      key={item.question_id}
                      aria-current={
                        item.question_id === question.question_id
                          ? "step"
                          : undefined
                      }
                      aria-label={`Câu ${index + 1}${item.answered ? ", đã trả lời" : ""}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${item.answered ? "border-primary-700 bg-primary-700 text-white" : item.question_id === question.question_id ? "border-primary-700 bg-primary-50 text-primary-800" : "bg-white text-gray-500"}`}
                    >
                      {item.answered ? (
                        <Check size={15} aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-gray-500">
                  {completed}/{questions.length} câu đã hoàn thành
                </p>
              </div>
              <section className="surface !p-6 sm:!p-10">
                <div className="mb-7 flex items-center justify-between">
                  <span className="badge">Part {question.part}</span>
                  <span className="text-xs text-gray-500">
                    Câu {completed + 1}
                  </span>
                </div>
                <h2
                  lang="en"
                  className="max-w-3xl text-2xl font-semibold leading-relaxed sm:text-3xl"
                >
                  {question.question_text}
                </h2>
                <div className="my-9 border-t" />
                <div className="text-center">
                  <p
                    className={`font-mono text-4xl tabular-nums ${recorder.isRecording ? "text-red-700" : "text-gray-800"}`}
                  >
                    {clock}
                  </p>
                  <p role="status" className="mb-7 mt-3 text-sm text-gray-500">
                    {submission.submitting
                      ? "Đang phân tích câu trả lời…"
                      : recorder.isPaused
                        ? "Đã tạm dừng"
                        : recorder.isRecording
                          ? "Đang ghi âm câu trả lời"
                          : recorder.audioBlob
                            ? "Nghe lại, hoặc ghi âm lại nếu bạn muốn."
                            : "Sẵn sàng khi bạn sẵn sàng."}
                  </p>
                  {recorder.audioUrl && !recorder.isRecording && (
                    <audio
                      className="mx-auto mb-6 w-full max-w-md"
                      controls
                      src={recorder.audioUrl}
                    >
                      Trình duyệt không hỗ trợ phát âm thanh.
                    </audio>
                  )}
                  <div className="flex flex-wrap justify-center gap-3">
                    {!recorder.isRecording ? (
                      <button
                        className="btn-secondary"
                        disabled={submission.submitting}
                        onClick={() => {
                          submission.clearLastSubmission();
                          recorder.startRecording();
                        }}
                      >
                        {recorder.audioBlob ? (
                          <RotateCcw size={17} aria-hidden="true" />
                        ) : (
                          <Mic size={17} aria-hidden="true" />
                        )}
                        {recorder.audioBlob ? "Ghi âm lại" : "Bắt đầu ghi âm"}
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            recorder.isPaused
                              ? recorder.resumeRecording()
                              : recorder.pauseRecording()
                          }
                        >
                          {recorder.isPaused ? (
                            <Play size={17} aria-hidden="true" />
                          ) : (
                            <Pause size={17} aria-hidden="true" />
                          )}
                          {recorder.isPaused ? "Tiếp tục" : "Tạm dừng"}
                        </button>
                        <button
                          className="btn border border-red-200 bg-red-50 text-red-800"
                          onClick={recorder.stopRecording}
                        >
                          <Square size={17} aria-hidden="true" />
                          Dừng ghi âm
                        </button>
                      </>
                    )}
                    <button
                      className="btn-primary"
                      disabled={
                        !recorder.audioBlob ||
                        recorder.isRecording ||
                        submission.submitting
                      }
                      onClick={submit}
                    >
                      {submission.submitting ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowRight size={17} aria-hidden="true" />
                      )}
                      {submission.submitting
                        ? "Đang phân tích…"
                        : "Nộp và tiếp tục"}
                    </button>
                  </div>
                  <p className="mt-6 text-xs text-gray-500">
                    Mỗi bản ghi tối đa 5 phút. Bài thi được lưu khi bạn nộp từng
                    câu.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
