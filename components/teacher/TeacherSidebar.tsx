"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/logout/actions";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/teacher", label: "대시보드", exact: true },
  { href: "/teacher/courses", label: "강의 관리", exact: false },
  { href: "/teacher/quizzes", label: "퀴즈 관리", exact: false },
  { href: "/teacher/students", label: "수강생 관리", exact: false },
  { href: "/teacher/messages", label: "학생 질문", exact: false },
];

export default function TeacherSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initial = userName.slice(0, 2) || "TC";

  return (
    <aside className="w-56 shrink-0 bg-white dark:bg-[#0d1224] border-r border-gray-200 dark:border-gray-700/50 flex flex-col h-full">
      {/* 로고 */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0 text-white">
            AI
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight text-gray-900 dark:text-white">LearnAI</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">AI-powered LMS</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, exact }) => {
          let active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600/20 text-blue-700 dark:text-white font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 유저 정보 + 계정관리 + 로그아웃 */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300 shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">선생님</p>
          </div>
        </div>
        <div className="space-y-1">
          <Link
            href="/teacher/account"
            className={`block w-full px-3 py-2 rounded-lg text-xs transition-colors text-left ${
              pathname === "/teacher/account"
                ? "bg-blue-600/20 text-blue-700 dark:text-white font-medium"
                : "bg-gray-100 dark:bg-gray-700/40 hover:bg-gray-200 dark:hover:bg-gray-600/40 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            계정 관리
          </Link>
          <ThemeToggle />
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs transition-colors text-left"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
