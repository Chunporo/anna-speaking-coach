import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import Home from "@/app/page";
import Login from "@/app/login/page";
import Practice from "@/app/practice/page";
import MockList from "@/app/mock-test/page";
import Pronunciation from "@/app/pronunciation/page";
import Streak from "@/app/streak/page";
import TestPage from "@/app/mock-test/[testId]/page";
import Detail from "@/app/practice/[questionId]/page";
import { useAuthStore } from "@/lib/store";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  push: vi.fn(),
  search: "",
  pathname: "/practice",
}));
vi.mock("@/lib/api", () => ({
  default: { get: mocks.get, post: mocks.post, delete: mocks.delete },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => mocks.pathname,
  useParams: () => ({ questionId: "7" }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("recharts", () => {
  const C = ({ children }: any) => <div>{children}</div>;
  return {
    BarChart: C,
    Bar: C,
    XAxis: C,
    YAxis: C,
    CartesianGrid: C,
    Tooltip: C,
    ResponsiveContainer: C,
    LineChart: C,
    Line: C,
  };
});
class Recorder {
  static isTypeSupported = () => true;
  static latest: Recorder;
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: any;
  onstop: any;
  constructor() {
    Recorder.latest = this;
  }
  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["voice"], { type: "audio/webm" }),
    });
    this.onstop?.();
  }
}
const speech = vi.fn((utterance: any) =>
  queueMicrotask(() => utterance.onend()),
);
const audio = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  currentTime: 0,
  onended: null as any,
  onerror: null as any,
};
const question = {
  id: 7,
  part: 1,
  topic: "Travel",
  question_text: "Where would you travel?",
};
const session = {
  id: 2,
  question_id: 7,
  part: 1,
  audio_url: "/recording.webm",
  transcription: "Google Cloud transcription",
  fluency_score: 7,
  vocabulary_score: 6,
  grammar_score: 5,
  pronunciation_score: null,
  overall_band: 6,
  feedback: "Useful feedback",
  created_at: new Date().toISOString(),
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = "";
  mocks.pathname = "/practice";
  mocks.get.mockResolvedValue({ data: [] });
  mocks.post.mockResolvedValue({ data: { id: 42 } });
  mocks.delete.mockResolvedValue({});
  useAuthStore.setState({ token: null, user: null });
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  vi.stubGlobal("speechSynthesis", { speak: speech, cancel: vi.fn() });
  vi.stubGlobal("Audio", function () {
    return audio;
  });
  URL.createObjectURL = vi.fn().mockReturnValue("blob:recording");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const change = (name: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
it("dashboard loads progress, refreshes on focus, and retries a failed request", async () => {
  mocks.get.mockRejectedValueOnce(new Error("offline"));
  render(<Home />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Chưa thể tải");
  mocks.get.mockImplementation(async (url: string) => ({
    data: url.endsWith("daily")
      ? { practice_count: 26, target_count: 25 }
      : url.endsWith("streak")
        ? { current_streak: 4, longest_streak: 8 }
        : url.endsWith("part-progress")
          ? [
              { part: 1, completed_count: 4, total_count: 5 },
              { part: 2, completed_count: 0, total_count: 0 },
            ]
          : [
              {
                date: new Date().toISOString().slice(0, 10),
                practice_count: 8,
              },
            ],
  }));
  click("Thử lại");
  await screen.findByText("Bạn đã đạt mục tiêu hôm nay. Thật đáng tự hào!");
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  expect(screen.getByText("4 / 5 câu")).toBeInTheDocument();
  const count = mocks.get.mock.calls.length;
  fireEvent.focus(window);
  await waitFor(() =>
    expect(mocks.get.mock.calls.length).toBeGreaterThan(count),
  );
});
it("sidebar shows account and logs out from desktop and mobile", async () => {
  useAuthStore.setState({
    token: "test-token",
    user: { id: 1, username: "Anna", email: "anna@example.test" } as any,
  });
  const view = render(<Pronunciation />);
  expect(screen.getByText("Anna")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Đăng xuất" })[0]);
  expect(mocks.push).toHaveBeenCalledWith("/login");
  expect(useAuthStore.getState().user).toBeNull();
  act(() => useAuthStore.setState({ user: { username: "Bee" } as any }));
  fireEvent.click(screen.getAllByRole("button", { name: "Đăng xuất" })[1]);
  expect(useAuthStore.getState().user).toBeNull();
  view.unmount();
});
it("pronunciation accordion opens one lesson, switches and closes", () => {
  render(<Pronunciation />);
  const buttons = screen.getAllByRole("button", { expanded: false });
  fireEvent.click(buttons[0]);
  expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
  expect(screen.getAllByRole("region")).toHaveLength(1);
  fireEvent.click(buttons[1]);
  expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(buttons[1]);
  expect(screen.queryByRole("region")).toBeNull();
});
it.each([false, true])(
  "auth submits login or registration (register=%s)",
  async (register) => {
    mocks.post.mockImplementation(async (url: string) => ({
      data: url.endsWith("login") ? { access_token: "session-test" } : {},
    }));
    mocks.get.mockResolvedValue({ data: { id: 1, username: "learner" } });
    render(<Login />);
    if (register) click("Đăng ký");
    change("Tên đăng nhập", "learner");
    change(/^Mật khẩu/, "test-passphrase");
    if (register) change("Email", "learner@example.test");
    fireEvent.submit(screen.getByLabelText("Tên đăng nhập").closest("form")!);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/"));
    expect(useAuthStore.getState().token).toBe("session-test");
    expect(useAuthStore.getState().user?.username).toBe("learner");
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/auth/login",
      "username=learner&password=test-passphrase",
      expect.anything(),
    );
    if (register)
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({ email: "learner@example.test" }),
      );
  },
);
it("auth displays server error and can retry", async () => {
  mocks.post.mockRejectedValueOnce({
    response: { data: { detail: "Invalid credentials" } },
  });
  render(<Login />);
  change("Tên đăng nhập", "learner");
  change(/^Mật khẩu/, "pass");
  fireEvent.submit(screen.getByLabelText("Tên đăng nhập").closest("form")!);
  expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  click("Đăng ký");
  expect(screen.queryByText("Invalid credentials")).toBeNull();
});
it("practice filters answered questions, searches and clears filters", async () => {
  mocks.get.mockImplementation(async (url: string) => ({
    data:
      url === "/api/practice/"
        ? [
            { question_id: 7, user_question_id: null, audio_url: "recording" },
            { question_id: 8, user_question_id: null, audio_url: null },
          ]
        : [
            question,
            {
              ...question,
              id: 8,
              topic: null,
              question_text: "What do you enjoy?",
            },
          ],
  }));
  render(<Practice />);
  await screen.findByText(question.question_text);
  click("Ẩn câu đã luyện");
  expect(screen.queryByText(question.question_text)).toBeNull();
  change("Tìm câu hỏi hoặc chủ đề", "missing");
  await screen.findByText("Chưa tìm thấy câu hỏi phù hợp");
  click("Xóa bộ lọc");
  expect(screen.getByText(question.question_text)).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("tab", { name: /Part 1/ }), {
    key: "ArrowRight",
  });
  await waitFor(() =>
    expect(mocks.get).toHaveBeenCalledWith("/api/questions", {
      params: { part: 2 },
    }),
  );
  fireEvent.keyDown(screen.getByRole("tab", { name: /Part 2/ }), {
    key: "End",
  });
  await waitFor(() =>
    expect(mocks.get).toHaveBeenCalledWith("/api/questions/user-questions", {
      params: {},
    }),
  );
  fireEvent.keyDown(screen.getByRole("tab", { name: "Câu hỏi của bạn" }), {
    key: "Home",
  });
  fireEvent.keyDown(screen.getByRole("tab", { name: /Part 1/ }), {
    key: "ArrowLeft",
  });
});
it("custom question creation preserves failed drafts and reloads after successful save", async () => {
  mocks.search = "custom=true";
  mocks.get.mockResolvedValue({ data: [] });
  render(<Practice />);
  await screen.findByText("Không gian cho những câu hỏi của bạn");
  click("Thêm câu hỏi đầu tiên");
  change("Nội dung câu hỏi", "  My new question?  ");
  change(/Chủ đề/, "Life");
  mocks.post.mockRejectedValueOnce(new Error("offline"));
  click("Lưu câu hỏi");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Nội dung của bạn vẫn được giữ lại",
  );
  expect(screen.getByLabelText("Nội dung câu hỏi")).toHaveValue(
    "  My new question?  ",
  );
  click("Lưu câu hỏi");
  await waitFor(() =>
    expect(screen.queryByLabelText("Nội dung câu hỏi")).toBeNull(),
  );
  expect(mocks.post).toHaveBeenLastCalledWith("/api/questions/user-questions", {
    part: 1,
    topic: "Life",
    question_text: "My new question?",
  });
});
it("question list recovers by switching tabs after fetch failure", async () => {
  mocks.get.mockRejectedValueOnce(new Error("offline"));
  render(<Practice />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("tab", { name: /Part 3/ }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
it("mock list shows completed scores and starts each test type", async () => {
  mocks.get.mockResolvedValue({
    data: [
      { ...session, test_type: "FULL", feedback: "Completed" },
      {
        ...session,
        id: 3,
        test_type: "PART2",
        feedback: null,
        fluency_score: null,
      },
    ],
  });
  render(<MockList />);
  await screen.findByText("Đã hoàn thành");
  expect(screen.getByText("7.0")).toBeInTheDocument();
  expect(screen.getByText("Sẵn sàng để tiếp tục")).toBeInTheDocument();
  click("Bắt đầu Part 1");
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/mock-test/42"));
  expect(mocks.post).toHaveBeenCalledWith("/api/mock-test/", {
    test_type: "PART1",
  });
});
it("mock list handles empty history and failed starts", async () => {
  mocks.get.mockRejectedValue(new Error("offline"));
  mocks.post.mockRejectedValue(new Error("offline"));
  render(<MockList />);
  await screen.findByText("Hành trình thi thử bắt đầu ở đây");
  click("Bắt đầu Full test");
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa thể bắt đầu"),
  );
  expect(
    screen.getByRole("button", { name: "Bắt đầu Full test" }),
  ).toBeEnabled();
});
const analytics = {
  current_streak: 3,
  off_days: 2,
  this_month: 5,
  total_completions: 20,
  calendar_days: [
    {
      date: new Date().toISOString().slice(0, 10),
      practice_count: 2,
      has_activity: true,
    },
  ],
  yearly_heatmap: [
    { date: new Date().toISOString().slice(0, 10), practice_count: 8 },
  ],
  streak_history: [
    { start_date: "2026-01-02", streak_length: 3, is_active: true },
    { start_date: "2025-01-02", streak_length: 2, is_active: false },
  ],
  weekly_pattern: [{ day_of_week: 1, day_name: "Monday", total_practice: 4 }],
  monthly_progress: [{ month: "Jan", year: 2026, total_practice: 5 }],
  time_of_day: [
    { period: "Morning", total_practice: 4 },
    { period: "Other", total_practice: 1 },
  ],
};
it("streak renders analytics, changes months and refreshes", async () => {
  mocks.get.mockResolvedValue({ data: analytics });
  render(<Streak />);
  await screen.findByText("Buổi sáng");
  expect(screen.getByText("Other")).toBeInTheDocument();
  expect(screen.getByText(/Đang tiếp tục/)).toBeInTheDocument();
  const month = new Date().getMonth() + 1;
  click("Tháng trước");
  await waitFor(() =>
    expect(mocks.get).toHaveBeenLastCalledWith(
      "/api/progress/streak-analytics",
      {
        params: {
          year:
            month === 1
              ? new Date().getFullYear() - 1
              : new Date().getFullYear(),
          month: month === 1 ? 12 : month - 1,
        },
      },
    ),
  );
  click("Tháng sau");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Làm mới" })).toBeEnabled(),
  );
  click("Làm mới");
  await waitFor(() => expect(mocks.get.mock.calls.length).toBe(4));
});
it("streak retries errors and displays empty streak history", async () => {
  mocks.get.mockRejectedValueOnce(new Error("offline"));
  render(<Streak />);
  await screen.findByText("Chưa có dữ liệu tiến độ");
  mocks.get.mockResolvedValue({ data: { ...analytics, streak_history: [] } });
  click("Làm mới");
  await screen.findByText(
    "Hoàn thành bản ghi đầu tiên để bắt đầu một chuỗi ngày mới.",
  );
  expect(screen.queryByRole("alert")).toBeNull();
});
it("mock detail records, pauses, resumes and completes an answer", async () => {
  mocks.get
    .mockResolvedValueOnce({
      data: [
        {
          question_id: 7,
          part: 1,
          question_text: question.question_text,
          answered: false,
        },
        {
          question_id: 8,
          part: 2,
          question_text: "Done question",
          answered: true,
        },
      ],
    })
    .mockResolvedValue({
      data: [
        {
          question_id: 7,
          part: 1,
          question_text: question.question_text,
          answered: true,
        },
      ],
    });
  mocks.post.mockResolvedValue({ data: session });
  render(<TestPage params={{ testId: "3" }} />);
  await screen.findByText(question.question_text);
  click("Bắt đầu ghi âm");
  await screen.findByText("Đang ghi âm câu trả lời");
  click("Tạm dừng");
  expect(screen.getByText("Đã tạm dừng")).toBeInTheDocument();
  click("Tiếp tục");
  click("Dừng ghi âm");
  click("Nộp và tiếp tục");
  await screen.findByText("Bạn đã hoàn thành phiên thi thử.");
  expect(mocks.post).toHaveBeenCalledWith("/api/mock-test/3/answers/7", {
    session_id: 2,
  });
});
it("mock detail preserves analyzed audio when attaching fails and retries attachment", async () => {
  mocks.get.mockResolvedValue({
    data: [
      {
        question_id: 7,
        part: 1,
        question_text: question.question_text,
        answered: false,
      },
    ],
  });
  mocks.post.mockImplementation(async (url: string) => {
    if (url.includes("/answers/")) throw new Error("offline");
    return { data: session };
  });
  render(<TestPage params={{ testId: "3" }} />);
  await screen.findByText(question.question_text);
  click("Bắt đầu ghi âm");
  await screen.findByText("Đang ghi âm câu trả lời");
  click("Dừng ghi âm");
  click("Nộp và tiếp tục");
  await screen.findByRole("alert");
  click("Nộp và tiếp tục");
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bản ghi vẫn được giữ lại",
    ),
  );
  expect(
    mocks.post.mock.calls.filter(([url]) => url === "/api/practice/analyze"),
  ).toHaveLength(1);
  click("Ghi âm lại");
  await screen.findByText("Đang ghi âm câu trả lời");
});
it.each([
  { response: { data: { detail: "Missing test" } } },
  new Error("offline"),
])("mock detail reports load failure", async (error) => {
  mocks.get.mockRejectedValue(error);
  render(<TestPage params={{ testId: "8" }} />);
  await screen.findByText("Chưa thể mở bài thi này");
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
it("practice detail records and analyzes custom answer, plays and resets, handles history controls", async () => {
  mocks.search = "custom=true";
  mocks.get.mockImplementation(async (url: string) => ({
    data: url.includes("/questions/")
      ? question
      : url.includes("/audio/")
        ? new Blob(["audio"])
        : {
            total_practices: 3,
            sessions: [
              session,
              {
                ...session,
                id: 3,
                audio_url: null,
                feedback: null,
                overall_band: null,
                created_at: new Date(Date.now() - 86400000).toISOString(),
              },
              {
                ...session,
                id: 4,
                overall_band: 8,
                created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
              },
            ],
          },
  }));
  mocks.post.mockResolvedValue({ data: session });
  render(<Detail />);
  await screen.findByRole("heading", { name: question.question_text });
  await screen.findByText("Đã luyện: 3 lần");
  fireEvent.click(screen.getAllByTitle("Xem phản hồi")[0]);
  expect(screen.getByText("Useful feedback")).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("Ẩn phản hồi"));
  fireEvent.click(screen.getAllByTitle("Phát lại bản ghi")[0]);
  await waitFor(() => expect(audio.play).toHaveBeenCalled());
  fireEvent.click(screen.getAllByRole("button", { name: "Xóa bản ghi" })[0]);
  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith(
      "Đã xóa bản ghi âm. Lịch sử và phản hồi được giữ lại.",
    ),
  );
  click("Nghe câu hỏi");
  await waitFor(() => expect(speech).toHaveBeenCalled());
  click("Ghi âm ngay");
  await screen.findByText("Đang ghi âm...");
  click("Tạm dừng");
  click("Tiếp tục");
  click("Dừng");
  click("Phát bản ghi");
  click("Dừng phát bản ghi");
  click("Gửi để phân tích");
  await screen.findByText("Kết quả phân tích");
  expect(
    (mocks.post.mock.calls[0][1] as FormData).get("user_question_id"),
  ).toBe("7");
  click("Luyện lại câu này");
  expect(screen.queryByText("Kết quả phân tích")).toBeNull();
  click("Luyện từng câu");
  expect(mocks.push).toHaveBeenCalledWith("/practice");
});
it("practice detail shows missing questions on fetch errors", async () => {
  mocks.get.mockRejectedValue(new Error("offline"));
  render(<Detail />);
  await screen.findByText("Không tìm thấy câu hỏi");
});
it("practice detail retains recording after analysis failure and reports speech/play/history errors", async () => {
  mocks.get.mockImplementation(async (url: string) => {
    if (url.includes("/audio/")) throw new Error("offline");
    return {
      data: url.includes("/questions/")
        ? question
        : { total_practices: 1, sessions: [session] },
    };
  });
  mocks.post.mockRejectedValue({
    response: { data: { detail: "Analysis unavailable" } },
  });
  mocks.delete.mockRejectedValue(new Error("offline"));
  speech.mockImplementationOnce((u: any) =>
    queueMicrotask(() => u.onerror(new Error("failed"))),
  );
  render(<Detail />);
  await screen.findByRole("heading", { name: question.question_text });
  click("Nghe câu hỏi");
  await screen.findByText("Failed to play question audio");
  fireEvent.click(screen.getByTitle("Phát lại bản ghi"));
  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith(
      "Không thể phát bản ghi. Vui lòng thử lại.",
    ),
  );
  click("Xóa bản ghi");
  await waitFor(() =>
    expect(window.alert).toHaveBeenCalledWith(
      "Không thể xóa bản ghi âm. Vui lòng thử lại.",
    ),
  );
  click("Ghi âm ngay");
  await screen.findByText("Đang ghi âm...");
  click("Dừng");
  audio.play.mockRejectedValueOnce(new Error("Playback blocked"));
  click("Phát bản ghi");
  await screen.findByText("Failed to play recording");
  click("Gửi để phân tích");
  await screen.findByText("Analysis unavailable");
  click("Ghi âm lại");
  expect(
    screen.getByRole("button", { name: "Ghi âm ngay" }),
  ).toBeInTheDocument();
});
it("custom form closes, changes part, and links saved questions to custom practice", async () => {
  mocks.search = "custom=true";
  mocks.get.mockImplementation(async (url: string) => ({
    data:
      url === "/api/practice/"
        ? [{ user_question_id: 7, question_id: null, audio_url: "voice" }]
        : [question],
  }));
  render(<Practice />);
  await screen.findByText(question.question_text);
  expect(screen.getByRole("link", { name: /Luyện ngay/ })).toHaveAttribute(
    "href",
    "/practice/7?custom=true",
  );
  click("Thêm câu hỏi");
  change("Phần thi", "3");
  change("Nội dung câu hỏi", "A custom question?");
  click("Đóng biểu mẫu");
  expect(screen.queryByLabelText("Nội dung câu hỏi")).toBeNull();
  click("Thêm câu hỏi");
  expect(screen.getByLabelText("Phần thi")).toHaveValue("3");
  click("Lưu câu hỏi");
  await waitFor(() =>
    expect(mocks.post).toHaveBeenCalledWith("/api/questions/user-questions", {
      part: 3,
      topic: "",
      question_text: "A custom question?",
    }),
  );
});
it("practice ignores stale question requests when switching tabs", async () => {
  let resolve: any;
  mocks.get.mockImplementation((url: string, options: any) =>
    url === "/api/practice/"
      ? Promise.resolve({ data: [] })
      : options.params.part === 1
        ? new Promise((r) => (resolve = r))
        : Promise.resolve({
            data: [{ ...question, id: 8, question_text: "Newest question" }],
          }),
  );
  render(<Practice />);
  fireEvent.click(screen.getByRole("tab", { name: /Part 2/ }));
  await screen.findByText("Newest question");
  await act(async () => resolve({ data: [question] }));
  expect(screen.queryByText(question.question_text)).toBeNull();
  expect(screen.getByText("Newest question")).toBeInTheDocument();
});
it("practice still shows questions when history is unavailable and invalid part defaults to one", async () => {
  mocks.search = "part=99";
  mocks.get.mockImplementation(async (url: string) => {
    if (url === "/api/practice/") throw new Error("offline");
    return { data: [question] };
  });
  render(<Practice />);
  await screen.findByText(question.question_text);
  expect(mocks.get).toHaveBeenCalledWith("/api/questions", {
    params: { part: 1 },
  });
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.keyDown(screen.getByRole("tab", { name: /Part 1/ }), {
    key: "Enter",
  });
  expect(screen.getByRole("tab", { name: /Part 1/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
it.each([new Error("Microphone denied"), {}])(
  "practice surfaces microphone access failures",
  async (error) => {
    mocks.get.mockImplementation(async (url: string) => ({
      data: url.includes("/questions/")
        ? question
        : { sessions: [], total_practices: 0 },
    }));
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(error);
    render(<Detail />);
    await screen.findByRole("heading", { name: question.question_text });
    click("Ghi âm ngay");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      error instanceof Error
        ? "Microphone denied"
        : "Failed to start recording",
    );
    expect(screen.getByRole("button", { name: "Ghi âm ngay" })).toBeEnabled();
  },
);
it.each(["Whisper transcription", "Ordinary transcription", null])(
  "practice submits standard question and renders transcription variant %s",
  async (transcription) => {
    mocks.get.mockImplementation(async (url: string) => ({
      data: url.includes("/questions/")
        ? question
        : { sessions: [], total_practices: 0 },
    }));
    mocks.post.mockResolvedValue({
      data: {
        ...session,
        transcription,
        feedback: null,
        fluency_score: null,
        vocabulary_score: null,
        grammar_score: null,
        overall_band: null,
      },
    });
    render(<Detail />);
    await screen.findByRole("heading", { name: question.question_text });
    click("Ghi âm ngay");
    await screen.findByText("Đang ghi âm...");
    click("Dừng");
    click("Phát bản ghi");
    act(() => audio.onended());
    expect(
      screen.getByRole("button", { name: "Phát bản ghi" }),
    ).toBeInTheDocument();
    click("Gửi để phân tích");
    await screen.findByText("Kết quả phân tích");
    expect((mocks.post.mock.calls[0][1] as FormData).get("question_id")).toBe(
      "7",
    );
    if (transcription)
      expect(
        screen.getByText(
          transcription.includes("Whisper") ? "🟢 Whisper" : "🎤 Transcription",
        ),
      ).toBeInTheDocument();
    else expect(screen.queryByText("Bản ghi chép:")).toBeNull();
  },
);
