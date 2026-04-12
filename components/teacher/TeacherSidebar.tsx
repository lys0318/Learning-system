"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/logout/actions";
import ThemeToggle from "@/components/ThemeToggle";
import LogoIcon from "@/components/LogoIcon";

const NAV_SECTIONS = [
  {
    label: "메인",
    items: [
      { href: "/teacher", label: "대시보드", icon: "🏠", exact: true },
    ],
  },
  {
    label: "강의 관리",
    items: [
      { href: "/teacher/courses", label: "강의 관리", icon: "📋", exact: false },
      { href: "/teacher/quizzes", label: "퀴즈 관리", icon: "🎯", exact: false },
    ],
  },
  {
    label: "수강생",
    items: [
      { href: "/teacher/students", label: "수강생 관리", icon: "👥", exact: false },
      { href: "/teacher/messages", label: "학생 질문", icon: "💬", exact: false },
    ],
  },
];

export default function TeacherSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initial = userName.slice(0, 2) || "TC";

  return (
    <aside className="w-56 shrink-0 dark:bg-[#070d1a] bg-white border-r border-gray-200 dark:border-white/[0.06] flex flex-col h-full">
      {/* 로고 */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <LogoIcon size={32} />
          <div>
            <p className="font-bold text-sm leading-tight text-gray-900 dark:text-white">LearnAI</p>
            <p className="text-gray-400 dark:text-gray-600 text-[10px]">AI-powered LMS</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="text-[9.5px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[.8px] px-2.5 mb-1.5">
              {section.label}
            </p>
            {section.items.map(({ href, label, icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all mb-0.5 ${
                    active
                      ? "bg-indigo-600/20 text-indigo-300"
                      : "text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded bg-indigo-500" />
                  )}
                  <span className="text-sm leading-none">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 유저 정보 + 계정관리 + 로그아웃 */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl dark:bg-white/[0.04] bg-gray-100 mb-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #4338ca, #6366f1)" }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600">선생님</p>
          </div>
        </div>
        <div className="space-y-0.5">
          <Link
            href="/teacher/account"
            className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs transition-all ${
              pathname === "/teacher/account"
                ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                : "text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            ⚙️ &nbsp;계정 관리
          </Link>
          <ThemeToggle />
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all text-left"
            >
              🚪 &nbsp;로그아웃
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
