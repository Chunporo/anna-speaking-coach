"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getErrorMessage } from "@/lib/errorHandler";
import { AnnaBrand } from "@/components/Sidebar";
import { ArrowRight, Mic, Loader2, Check } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleClientId] = useState(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  );
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  const handleGoogleSignIn = useCallback(
    async (response: any) => {
      setError("");
      try {
        if (!response?.credential) {
          throw new Error("Không nhận được token từ Google. Vui lòng thử lại.");
        }

        const authResponse = await api.post("/api/auth/google", {
          token: response.credential,
        });

        if (!authResponse.data?.access_token) {
          throw new Error("Không nhận được token từ server. Vui lòng thử lại.");
        }

        setToken(authResponse.data.access_token);
        const userResponse = await api.get("/api/auth/me");
        setUser(userResponse.data);
        router.push("/");
      } catch (err: any) {
        console.error("Google Sign-In error:", err);

        // Provide more specific error messages
        if (err.response?.status === 401) {
          setError(
            "Xác thực Google thất bại. Token không hợp lệ hoặc đã hết hạn.",
          );
        } else if (err.response?.status === 403) {
          setError("Không có quyền truy cập. Vui lòng kiểm tra cấu hình CORS.");
        } else if (err.response?.status === 503) {
          setError(
            "Không thể kết nối đến Google OAuth service. Vui lòng thử lại sau.",
          );
        } else if (
          err.code === "ERR_NETWORK" ||
          err.message?.includes("Network Error")
        ) {
          setError(
            "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.",
          );
        } else {
          setError(
            getErrorMessage(err) ||
              "Đăng nhập Google thất bại. Vui lòng thử lại.",
          );
        }
      }
    },
    [setToken, setUser, router],
  );

  useEffect(() => {
    // Only load Google OAuth if client_id is configured
    if (!googleClientId) {
      console.warn(
        "Google OAuth client ID not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local",
      );
      return;
    }

    // Check if this is a cloud IDE environment that may have proxy/network restrictions
    // These environments often block external script loading
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    const isCloudIDE =
      hostname.includes("puter.com") ||
      hostname.includes("codesandbox") ||
      hostname.includes("stackblitz") ||
      hostname.includes("replit") ||
      hostname.includes("gitpod") ||
      origin.includes("js.puter.com");

    if (isCloudIDE) {
      console.warn(
        `Cloud IDE environment detected (${hostname}) - Google Sign-In disabled due to network restrictions`,
      );
      setGoogleError(
        "Google Sign-In không khả dụng trong môi trường cloud IDE này (hạn chế proxy/mạng). Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu.",
      );
      setGoogleLoaded(false);
      return; // Early return - don't attempt to load Google script
    }

    let retryCount = 0;
    const maxRetries = 2;

    const initializeGoogleSignIn = () => {
      // Prevent double initialization
      if (googleInitialized.current) return;

      if (window.google && window.google.accounts && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
          });

          // Render Google Sign-In button using ref
          const buttonContainer = googleButtonRef.current;
          if (buttonContainer && window.google.accounts.id.renderButton) {
            // Clear any existing content first to prevent conflicts
            buttonContainer.innerHTML = "";

            window.google.accounts.id.renderButton(buttonContainer, {
              theme: "outline",
              size: "large",
              width: 300, // Must be a pixel value, not a percentage
              text: "signin_with",
              locale: "vi",
            });

            googleInitialized.current = true;
          }

          setGoogleLoaded(true);
          setGoogleError(null);
        } catch (err: any) {
          console.error("Error initializing Google OAuth:", err);
          setGoogleError(
            "Không thể khởi tạo Google Sign-In. Vui lòng kiểm tra cấu hình.",
          );
          setGoogleLoaded(false);
        }
      } else {
        setGoogleError("Google Sign-In không khả dụng. Vui lòng thử lại sau.");
        setGoogleLoaded(false);
      }
    };

    // Check if script is already loaded
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existingScript) {
      // Script already exists, wait a bit and initialize
      setTimeout(initializeGoogleSignIn, 100);
      return;
    }

    const loadGoogleScript = () => {
      // Load Google Identity Services
      // Note: Don't set crossOrigin - Google's script should load without it
      // Setting crossOrigin can cause CORS issues
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Wait a bit for the script to fully initialize
        setTimeout(initializeGoogleSignIn, 100);
      };

      script.onerror = (error) => {
        // CORS errors from Google's server are a known limitation
        // They appear in console but the error event may not have the message
        // Since we can't reliably detect CORS in the error event, we'll:
        // 1. Check for known error patterns
        // 2. On first failure, check if it's likely a CORS issue
        // 3. Don't retry if it looks like CORS (it won't work)

        const errorMessage = error instanceof ErrorEvent ? error.message : "";
        const target = error instanceof ErrorEvent ? error.target : null;

        // Check for CORS indicators
        // CORS errors typically show as network failures even when server responds with 200
        // If script fails to load from Google on first attempt, it's likely CORS
        const isLikelyCorsError =
          retryCount === 0 &&
          (errorMessage.includes("Failed") ||
            errorMessage.includes("ERR_FAILED") ||
            errorMessage.includes("CORS") ||
            errorMessage.includes("Access-Control") ||
            (target &&
              (target as HTMLScriptElement).src?.includes(
                "accounts.google.com",
              )));

        const hasProxyError =
          errorMessage.includes("ERR_NO_SUPPORTED_PROXIES") ||
          errorMessage.includes("proxy") ||
          window.location.hostname.includes("puter.com") ||
          window.location.hostname.includes("codesandbox");

        // Don't retry for CORS or proxy errors - they won't work
        // CORS errors from Google are a browser/Google limitation, not our code
        if (hasProxyError) {
          setGoogleError(
            "Google Sign-In không khả dụng trong môi trường này (hạn chế proxy/mạng). Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu.",
          );
          setGoogleLoaded(false);
          return;
        }

        // For first attempt failures from localhost, it's likely CORS
        // Google's script sometimes has CORS issues from localhost
        // Don't retry - CORS errors won't be fixed by retrying
        if (
          retryCount === 0 &&
          (isLikelyCorsError || window.location.hostname === "localhost")
        ) {
          setGoogleError(
            "Google Sign-In bị chặn bởi chính sách CORS của trình duyệt/Google. Đây là hạn chế từ phía Google, không phải lỗi của ứng dụng. Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu.",
          );
          setGoogleLoaded(false);
          return;
        }

        // Don't log errors in cloud IDEs as they're expected
        if (!isCloudIDE) {
          console.error(
            "Failed to load Google Identity Services script",
            error,
          );
        }

        // For other errors, retry once (but not for CORS/proxy)
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Retrying to load Google Sign-In script (attempt ${retryCount + 1}/${maxRetries + 1})...`,
          );
          setTimeout(loadGoogleScript, 1000 * retryCount); // Exponential backoff
        } else {
          setGoogleError(
            "Không thể tải Google Sign-In. Vui lòng kiểm tra kết nối internet hoặc thử lại sau.",
          );
          setGoogleLoaded(false);
        }
      };

      document.head.appendChild(script);
    };

    loadGoogleScript();
    const buttonContainer = googleButtonRef.current;

    return () => {
      // Don't remove script on cleanup as it might be used by other components
      // Reset initialized flag so it can be re-initialized if needed
      googleInitialized.current = false;

      // Clear the button container to prevent React DOM conflicts
      if (buttonContainer) {
        buttonContainer.innerHTML = "";
      }

      setGoogleError(null);
    };
  }, [handleGoogleSignIn, googleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append("username", formData.username);
        params.append("password", formData.password);

        const response = await api.post("/api/auth/login", params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        setToken(response.data.access_token);
        const userResponse = await api.get("/api/auth/me");
        setUser(userResponse.data);
        router.push("/");
      } else {
        await api.post("/api/auth/register", formData);
        const params = new URLSearchParams({
          username: formData.username,
          password: formData.password,
        });
        const response = await api.post("/api/auth/login", params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        setToken(response.data.access_token);
        const userResponse = await api.get("/api/auth/me");
        setUser(userResponse.data);
        router.push("/");
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary-900 p-12 text-white lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary-500">
            <Mic size={23} aria-hidden="true" />
          </span>
          <span className="text-3xl font-semibold tracking-tight">anna.</span>
          <span className="ml-auto text-xs tracking-widest text-primary-200">
            SPEAKING COACH
          </span>
        </div>
        <div className="py-16">
          <p className="mb-6 text-xs uppercase tracking-[.2em] text-primary-200">
            Bắt đầu từ giọng nói của bạn
          </p>
          <h2 className="max-w-lg text-5xl font-semibold leading-[1.15] xl:text-6xl">
            Tự tin hơn.
            <br />
            Từng câu nói.
          </h2>
          <p className="mt-7 max-w-md text-base leading-8 text-primary-100">
            Một không gian để thử, lắng nghe và tiến bộ. Cùng Anna xây dựng thói
            quen luyện nói theo cách của bạn.
          </p>
          <div
            aria-hidden="true"
            className="my-12 flex h-24 items-center gap-2"
          >
            {[
              12, 25, 40, 21, 62, 86, 56, 34, 72, 94, 67, 40, 22, 48, 30, 14,
            ].map((height, i) => (
              <span
                key={i}
                className="w-2 rounded-full bg-primary-300"
                style={{ height, opacity: 0.35 + i / 40 }}
              />
            ))}
          </div>
          <div className="space-y-4">
            {[
              "Luyện theo chủ đề bạn quan tâm",
              "Ghi âm và nhìn lại từng lần luyện",
              "Theo dõi hành trình tiến bộ của bạn",
            ].map((text) => (
              <p
                key={text}
                className="flex items-center gap-3 text-sm text-primary-100"
              >
                <Check size={16} aria-hidden="true" />
                {text}
              </p>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary-200">
          Mỗi ngày một chút. Mỗi lần một tốt hơn.
        </p>
      </section>
      <section className="flex min-w-0 flex-col px-6 py-8 sm:px-12">
        <div className="mb-10 lg:hidden">
          <AnnaBrand />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-6 sm:py-12">
          <p className="eyebrow">Không gian của riêng bạn</p>
          <h1 className="page-title">
            {isLogin ? "Chào mừng bạn trở lại." : "Bắt đầu hành trình mới."}
          </h1>
          <p className="mb-8 mt-4 text-sm leading-7 text-gray-600">
            {isLogin
              ? "Tiếp tục luyện tập, thêm một bước tự tin."
              : "Tạo tài khoản để lưu lại những bước tiến của bạn."}
          </p>
          <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl border bg-white p-1">
            {[
              { value: true, label: "Đăng nhập" },
              { value: false, label: "Đăng ký" },
            ].map((tab) => (
              <button
                key={tab.label}
                disabled={pending}
                aria-pressed={isLogin === tab.value}
                onClick={() => {
                  setIsLogin(tab.value);
                  setError("");
                }}
                className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${isLogin === tab.value ? "bg-primary-50 text-primary-800" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            aria-busy={pending}
          >
            <label className="block">
              <span className="field-label">Tên đăng nhập</span>
              <input
                type="text"
                required
                autoComplete="username"
                name="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="field"
                aria-describedby={error ? "auth-error" : undefined}
              />
            </label>
            {!isLogin && (
              <label className="block">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="field"
                />
              </label>
            )}
            <label className="block">
              <span className="field-label">Mật khẩu</span>
              <input
                type="password"
                required
                minLength={isLogin ? undefined : 6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                name="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="field"
                aria-describedby={!isLogin ? "password-hint" : undefined}
              />
              {!isLogin && (
                <span
                  id="password-hint"
                  className="mt-2 block text-xs text-gray-500"
                >
                  Ít nhất 6 ký tự.
                </span>
              )}
            </label>
            {error && (
              <p id="auth-error" role="alert" className="notice">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full"
            >
              {pending ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Đang kết nối…
                </>
              ) : (
                <>
                  {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
          {googleClientId && (
            <div className="mt-7">
              <div className="mb-5 flex items-center gap-4 text-xs text-gray-500">
                <span className="h-px flex-1 bg-gray-200" />
                Hoặc tiếp tục với
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="flex min-h-[44px] justify-center">
                {!googleLoaded && !googleError && (
                  <p role="status" className="text-sm text-gray-500">
                    Đang tải Google Sign-In…
                  </p>
                )}
                <div
                  ref={googleButtonRef}
                  style={{ display: googleLoaded ? "block" : "none" }}
                />
              </div>
              {googleError && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  {googleError}
                </p>
              )}
            </div>
          )}
          <p className="mt-8 text-center text-xs leading-6 text-gray-500">
            Tập trung vào luyện tập.
            <br />
            Tiến bộ theo nhịp độ của riêng bạn.
          </p>
        </div>
      </section>
    </main>
  );
}
