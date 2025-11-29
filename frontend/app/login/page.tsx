'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const handleGoogleSignIn = useCallback(async (response: any) => {
    setError('');
    try {
      const authResponse = await api.post('/api/auth/google', {
        token: response.credential,
      });
      
      setToken(authResponse.data.access_token);
      const userResponse = await api.get('/api/auth/me');
      setUser(userResponse.data);
      router.push('/');
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  }, [setToken, setUser, router]);

  useEffect(() => {
    // Only load Google OAuth if client_id is configured
    if (!googleClientId) {
      console.warn('Google OAuth client ID not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local');
      return;
    }

    let retryCount = 0;
    const maxRetries = 2;

    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
          });
          setGoogleLoaded(true);
          setGoogleError(null);
          
          // Render Google Sign-In button
          const buttonContainer = document.getElementById('google-signin-button');
          if (buttonContainer && window.google.accounts.id.renderButton) {
            window.google.accounts.id.renderButton(buttonContainer, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'signin_with',
              locale: 'vi',
            });
          }
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
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        // Wait a bit for the script to fully initialize
        setTimeout(initializeGoogleSignIn, 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Identity Services script');
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
      // Just clear the error state
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

            <div id="google-signin-button" className="mt-4 w-full flex justify-center min-h-[42px]">
              {!googleLoaded && !googleError && (
                <div className="text-sm text-gray-500">Đang tải Google Sign-In...</div>
              )}
            </div>
            
            {googleError && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm">
                {googleError}
                <div className="mt-1 text-xs text-yellow-600">
                  Bạn vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu ở trên.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

