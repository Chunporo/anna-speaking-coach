import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Login from "@/app/login/page";
import { useAuthStore } from "@/lib/store";
const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  push: vi.fn(),
  router: null as any,
}));
mocks.router = { push: mocks.push };
vi.mock("@/lib/api", () => ({ default: { post: mocks.post, get: mocks.get } }));
vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => "/login",
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
const script = () =>
  document.querySelector<HTMLScriptElement>(
    'script[src="https://accounts.google.com/gsi/client"]',
  )!;
let initialize: ReturnType<typeof vi.fn>;
let renderButton: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubEnv(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    "fake-client-id.apps.example.test",
  );
  useAuthStore.setState({ token: null, user: null });
  mocks.post.mockResolvedValue({ data: { access_token: "fake-session" } });
  mocks.get.mockResolvedValue({ data: { username: "Learner" } });
  initialize = vi.fn();
  renderButton = vi.fn();
  vi.stubGlobal("google", { accounts: { id: { initialize, renderButton } } });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  document
    .querySelectorAll('script[src="https://accounts.google.com/gsi/client"]')
    .forEach((s) => s.remove());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function load() {
  render(<Login />);
  fireEvent.load(script());
  await act(() => vi.advanceTimersByTimeAsync(100));
  return initialize.mock.calls[0][0].callback;
}
it("loads identity script and authenticates Google credentials", async () => {
  const callback = await load();
  expect(initialize).toHaveBeenCalledWith({
    client_id: "fake-client-id.apps.example.test",
    callback: expect.any(Function),
  });
  expect(renderButton).toHaveBeenCalled();
  await act(() => callback({ credential: "fake-google-credential" }));
  expect(mocks.post).toHaveBeenCalledWith("/api/auth/google", {
    token: "fake-google-credential",
  });
  expect(useAuthStore.getState().user?.username).toBe("Learner");
  expect(mocks.push).toHaveBeenCalledWith("/");
});
it.each([
  [{ response: { status: 401 } }, "Xác thực Google thất bại."],
  [{ response: { status: 403 } }, "Không có quyền truy cập."],
  [
    { response: { status: 503 } },
    "Không thể kết nối đến Google OAuth service.",
  ],
  [{ code: "ERR_NETWORK" }, "Lỗi kết nối mạng."],
  [new Error("Network Error"), "Lỗi kết nối mạng."],
  [new Error("Provider unavailable"), "Provider unavailable"],
])(
  "shows actionable Google authentication errors %j",
  async (error, message) => {
    mocks.post.mockRejectedValueOnce(error);
    const callback = await load();
    await act(() => callback({ credential: "fake-google-credential" }));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(mocks.push).not.toHaveBeenCalled();
  },
);
it("rejects missing Google credential before contacting backend", async () => {
  const callback = await load();
  await act(() => callback({}));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Không nhận được token từ Google",
  );
  expect(mocks.post).not.toHaveBeenCalled();
});
it("rejects backend responses without an access token", async () => {
  mocks.post.mockResolvedValueOnce({ data: {} });
  const callback = await load();
  await act(() => callback({ credential: "fake-google-credential" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Không nhận được token từ server",
  );
  expect(mocks.get).not.toHaveBeenCalled();
});
it("reuses an existing identity script", async () => {
  const existing = document.createElement("script");
  existing.src = "https://accounts.google.com/gsi/client";
  document.head.appendChild(existing);
  render(<Login />);
  await act(() => vi.advanceTimersByTimeAsync(100));
  expect(initialize).toHaveBeenCalled();
  expect(
    document.querySelectorAll(
      'script[src="https://accounts.google.com/gsi/client"]',
    ),
  ).toHaveLength(1);
});
it("reports initialization exceptions and absent identity service", async () => {
  initialize.mockImplementationOnce(() => {
    throw new Error("invalid config");
  });
  const view = render(<Login />);
  fireEvent.load(script());
  await act(() => vi.advanceTimersByTimeAsync(100));
  expect(
    screen.getByText(/Không thể khởi tạo Google Sign-In/),
  ).toBeInTheDocument();
  view.unmount();
  vi.stubGlobal("google", undefined);
  render(<Login />);
  await act(() => vi.advanceTimersByTimeAsync(100));
  expect(
    screen.getByText("Google Sign-In không khả dụng. Vui lòng thử lại sau."),
  ).toBeInTheDocument();
});
it.each([
  ["proxy unavailable", /hạn chế proxy\/mạng/],
  ["CORS blocked", /bị chặn bởi chính sách CORS/],
])("reports script loading failures: %s", async (message, expected) => {
  render(<Login />);
  fireEvent(script(), new ErrorEvent("error", { message }));
  expect(screen.getByText(expected)).toBeInTheDocument();
  expect(initialize).not.toHaveBeenCalled();
});
it("explains unavailable Google sign-in in a cloud IDE without requesting a script", () => {
  vi.stubGlobal("location", {
    hostname: "workspace.gitpod.io",
    origin: "https://workspace.gitpod.io",
  });
  render(<Login />);
  expect(
    screen.getByText(
      /Google Sign-In không khả dụng trong môi trường cloud IDE này/,
    ),
  ).toBeInTheDocument();
  expect(script()).toBeNull();
});
it("retries transient script failures twice before presenting recovery guidance", async () => {
  vi.stubGlobal("location", {
    hostname: "anna.example.test",
    origin: "https://anna.example.test",
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  render(<Login />);
  // Generic browser error events carry no message/target details used for CORS heuristics.
  fireEvent.error(script());
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(
    document.querySelectorAll(
      'script[src="https://accounts.google.com/gsi/client"]',
    ),
  ).toHaveLength(2);
  const scripts = () =>
    document.querySelectorAll<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
  fireEvent.error(scripts()[1]);
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(scripts()).toHaveLength(3);
  fireEvent.error(scripts()[2]);
  expect(screen.getByText(/Không thể tải Google Sign-In/)).toBeInTheDocument();
});
