"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Mic,
  FileText,
  CalendarDays,
  LogOut,
  ArrowUpRight,
  AudioLines,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

const items = [
  { href: "/", label: "Tổng quan", short: "Tổng quan", icon: Home },
  { href: "/practice", label: "Luyện theo câu", short: "Luyện nói", icon: Mic },
  {
    href: "/mock-test",
    label: "Thi thử Speaking",
    short: "Thi thử",
    icon: FileText,
  },
  {
    href: "/streak",
    label: "Tiến độ học tập",
    short: "Tiến độ",
    icon: CalendarDays,
  },
];

export function AnnaBrand() {
  return (
    <Link
      href="/"
      aria-label="Anna — Trang chủ"
      className="inline-flex items-center gap-3"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-700 text-white">
        <Mic size={21} aria-hidden="true" />
      </span>
      <span className="text-2xl font-semibold tracking-tight">
        anna<span className="text-primary-700">.</span>
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <>
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <header className="fixed inset-x-0 top-0 z-40 flex h-20 items-center justify-between border-b bg-white px-5 md:hidden">
        <AnnaBrand />
        <span className="badge">Speaking coach</span>
      </header>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-white px-5 py-8 md:flex lg:w-64">
        <div className="mb-12 px-3">
          <AnnaBrand />
          <p className="mt-3 text-xs tracking-wide text-gray-500">
            Mỗi ngày một chút, tự tin hơn.
          </p>
        </div>
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[.18em] text-gray-500">
          Không gian học tập
        </p>
        <nav aria-label="Điều hướng chính" className="mt-4 space-y-2">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active(href) ? "bg-primary-50 text-primary-800" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
              {active(href) && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-700" />
              )}
            </Link>
          ))}
        </nav>
        <Link
          href="/pronunciation"
          aria-current={pathname === "/pronunciation" ? "page" : undefined}
          className="mt-8 rounded-2xl border bg-[#f7f8f4] p-4 transition-colors hover:bg-primary-50"
        >
          <AudioLines
            size={23}
            className="mb-3 text-primary-700"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold">Nói rõ, tự tin hơn</p>
          <p className="mt-1 text-xs leading-6 text-gray-600">
            Khám phá bài học phát âm.
          </p>
          <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary-800">
            Xem bài học <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </Link>
        <div className="mt-auto border-t pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-800">
              {(user?.username || "A").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.username || "Chào bạn"}
              </p>
              <p className="text-xs text-gray-500">Không gian cá nhân</p>
            </div>
          </div>
          {user ? (
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="mt-3 flex min-h-[44px] w-full items-center gap-2 px-3 text-sm text-gray-600 hover:text-primary-800"
            >
              <LogOut size={16} aria-hidden="true" />
              Đăng xuất
            </button>
          ) : (
            <Link href="/login" className="btn-quiet mt-2 w-full">
              Đăng nhập
            </Link>
          )}
        </div>
      </aside>
      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-white px-1 pt-2 md:hidden"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {items.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium ${active(href) ? "bg-primary-50 text-primary-800" : "text-gray-600"}`}
          >
            <Icon size={19} aria-hidden="true" />
            {short}
          </Link>
        ))}
        {user ? (
          <button
            aria-label="Đăng xuất"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[10px] text-gray-600"
          >
            <LogOut size={19} aria-hidden="true" />
            Đăng xuất
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[10px] text-gray-600"
          >
            <LogOut size={19} aria-hidden="true" />
            Đăng nhập
          </Link>
        )}
      </nav>
    </>
  );
}
