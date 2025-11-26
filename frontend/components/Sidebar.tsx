'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Mic, FileText, User, ChevronDown, Calendar, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useState, useRef, useEffect } from 'react';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/practice', label: 'Luyện theo câu', icon: Mic },
    { href: '/mock-test', label: 'Thi thử', icon: FileText },
    { href: '/streak', label: 'Streak Calendar', icon: Calendar },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAccountMenu]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="w-64 bg-white min-h-screen border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-600">Anna</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-gray-100 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 space-y-4">
        {/* Progress Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-16 h-16">
            <svg className="transform -rotate-90 w-16 h-16">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-gray-200"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={`${(0 / 25) * 175.9} 175.9`}
                className="text-primary-600"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">0/25</span>
            </div>
          </div>
        </div>

        {/* Premium Button */}
        <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Mua Xịn
        </button>

        {/* Account */}
        <div className="relative" ref={accountMenuRef}>
          <div
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User size={18} className="text-gray-600" />
              <span className="text-sm text-gray-700">Tài khoản</span>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`}
            />
          </div>

          {showAccountMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
              {user && (
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut size={16} className="text-gray-600" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

