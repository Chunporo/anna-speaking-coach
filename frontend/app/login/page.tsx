'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getErrorMessage } from '@/lib/errorHandler';

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
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleClientId] = useState(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  const handleGoogleSignIn = useCallback(async (response: any) => {
    setError('');
    try {
      if (!response?.credential) {
        throw new Error('Không nhận được token từ Google. Vui lòng thử lại.');
      }

      const authResponse = await api.post('/api/auth/google', {
        token: response.credential,
      });
      
      if (!authResponse.data?.access_token) {
        throw new Error('Không nhận được token từ server. Vui lòng thử lại.');
      }
      
      setToken(authResponse.data.access_token);
      const userResponse = await api.get('/api/auth/me');
      setUser(userResponse.data);
      router.push('/');
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      
      // Provide more specific error messages
      if (err.response?.status === 401) {
        setError('Xác thực Google thất bại. Token không hợp lệ hoặc đã hết hạn.');
      } else if (err.response?.status === 403) {
        setError('Không có quyền truy cập. Vui lòng kiểm tra cấu hình CORS.');
      } else if (err.response?.status === 503) {
        setError('Không thể kết nối đến Google OAuth service. Vui lòng thử lại sau.');
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.');
      } else {
        setError(getErrorMessage(err) || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    }
  }, [setToken, setUser, router]);

  useEffect(() => {
    // Only load Google OAuth if client_id is configured
    if (!googleClientId) {
      console.warn('Google OAuth client ID not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local');
      return;
    }

    // Check if this is a cloud IDE environment that may have proxy/network restrictions
    // These environments often block external script loading
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    const isCloudIDE = hostname.includes('puter.com') ||
                      hostname.includes('codesandbox') ||
                      hostname.includes('stackblitz') ||
                      hostname.includes('replit') ||
                      hostname.includes('gitpod') ||
                      origin.includes('js.puter.com');
    
    if (isCloudIDE) {
      console.warn(`Cloud IDE environment detected (${hostname}) - Google Sign-In disabled due to network restrictions`);
      setGoogleError('Google Sign-In không khả dụng trong môi trường cloud IDE này (hạn chế proxy/mạng). Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu.');
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
            buttonContainer.innerHTML = '';
            
            window.google.accounts.id.renderButton(buttonContainer, {
              theme: 'outline',
              size: 'large',
              width: 300, // Must be a pixel value, not a percentage
              text: 'signin_with',
              locale: 'vi',
            });
            
            googleInitialized.current = true;
          }
          
          setGoogleLoaded(true);
          setGoogleError(null);
        } catch (err: any) {
          console.error('Error initializing Google OAuth:', err);
          setGoogleError('Không thể khởi tạo Google Sign-In. Vui lòng kiểm tra cấu hình.');
          setGoogleLoaded(false);
        }
      } else {
        setGoogleError('Google Sign-In không khả dụng. Vui lòng thử lại sau.');
        setGoogleLoaded(false);
      }
    };

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      // Script already exists, wait a bit and initialize
      setTimeout(initializeGoogleSignIn, 100);
      return;
    }

    const loadGoogleScript = () => {
      // Load Google Identity Services
      // Note: Don't set crossOrigin - Google's script should load without it
      // Setting crossOrigin can cause CORS issues
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
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
        
        const errorMessage = error instanceof ErrorEvent ? error.message : '';
        const target = error instanceof ErrorEvent ? error.target : null;
        
        // Check for CORS indicators
        // CORS errors typically show as network failures even when server responds with 200
        // If script fails to load from Google on first attempt, it's likely CORS
        const isLikelyCorsError = retryCount === 0 && (
          errorMessage.includes('Failed') ||
          errorMessage.includes('ERR_FAILED') ||
          errorMessage.includes('CORS') ||
          errorMessage.includes('Access-Control') ||
          (target && (target as HTMLScriptElement).src?.includes('accounts.google.com'))
        );
        
        const hasProxyError = errorMessage.includes('ERR_NO_SUPPORTED_PROXIES') ||
                            errorMessage.includes('proxy') ||
                            window.location.hostname.includes('puter.com') ||
                            window.location.hostname.includes('codesandbox');
        
        // Don't retry for CORS or proxy errors - they won't work
        // CORS errors from Google are a browser/Google limitation, not our code
        if (hasProxyError) {
          setGoogleError('Google Sign-In không khả dụng trong môi trường này (hạn chế proxy/mạng). Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu.');
          setGoogleLoaded(false);
          return;
        }
        
        // For first attempt failures from localhost, it's likely CORS
        // Google's script sometimes has CORS issues from localhost
        // Don't retry - CORS errors won't be fixed by retrying
        if (retryCount === 0 && (isLikelyCorsError || window.location.hostname === 'localhost')) {
          setGoogleError('Google Sign-In bị chặn bởi chính sách CORS của trình duyệt/Google. Đây là hạn chế từ phía Google, không phải lỗi của ứng dụng. Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu.');
          setGoogleLoaded(false);
          return;
        }
        
        // Don't log errors in cloud IDEs as they're expected
        if (!isCloudIDE) {
          console.error('Failed to load Google Identity Services script', error);
        }
        
        // For other errors, retry once (but not for CORS/proxy)
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying to load Google Sign-In script (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          setTimeout(loadGoogleScript, 1000 * retryCount); // Exponential backoff
        } else {
          setGoogleError('Không thể tải Google Sign-In. Vui lòng kiểm tra kết nối internet hoặc thử lại sau.');
          setGoogleLoaded(false);
        }
      };
      
      document.head.appendChild(script);
    };

    loadGoogleScript();

    return () => {
      // Don't remove script on cleanup as it might be used by other components
      // Reset initialized flag so it can be re-initialized if needed
      googleInitialized.current = false;
      
      // Clear the button container to prevent React DOM conflicts
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
      
      setGoogleError(null);
    };
  }, [handleGoogleSignIn, googleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append('username', formData.username);
        params.append('password', formData.password);
        
        const response = await api.post('/api/auth/login', params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        setToken(response.data.access_token);
        const userResponse = await api.get('/api/auth/me');
        setUser(userResponse.data);
        router.push('/');
      } else {
        const response = await api.post('/api/auth/register', formData);
        setToken(response.data.access_token);
        setUser(response.data);
        router.push('/');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-primary-600 mb-8">
          Anna
        </h1>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              isLogin
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              !isLogin
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        {googleClientId && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            <div className="mt-4 w-full flex justify-center min-h-[42px]">
              {!googleLoaded && !googleError && (
                <div className="text-sm text-gray-500">Đang tải Google Sign-In...</div>
              )}
              {/* 
                Using a separate div with ref for Google button to prevent React DOM conflicts.
                Google's GSI library manipulates this div directly, so we keep it separate
                from React-managed content.
              */}
              <div 
                ref={googleButtonRef}
                style={{ display: googleLoaded ? 'block' : 'none' }}
              />
            </div>
            
            {googleError && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm">
                <div className="font-medium mb-1">⚠️ {googleError}</div>
                {!googleError.includes('Bạn vẫn có thể') && (
                  <div className="mt-1 text-xs text-yellow-600">
                    Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu ở trên.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

