"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

const PAGE_META: { pattern: RegExp; title: string; action?: { label: string; href: string } }[] = [
  { pattern: /^\/student$/, title: "학습 대시보드" },
  { pattern: /^\/student\/my-courses/, title: "내 강의" },
  { pattern: /^\/student\/ai-tutor/, title: "AI 튜터" },
  { pattern: /^\/student\/courses\/[^/]+\/chat/, title: "AI 튜터" },
  { pattern: /^\/student\/courses\/[^/]+$/, title: "강의 자료" },
  { pattern: /^\/student\/courses$/, title: "강의 둘러보기" },
  { pattern: /^\/student\/quizzes\/[^/]+/, title: "퀴즈 풀기" },
  { pattern: /^\/student\/quizzes/, title: "퀴즈" },
  { pattern: /^\/student\/messages/, title: "선생님 질문" },
  { pattern: /^\/student\/account/, title: "계정 관리" },
];

export default function StudentTopbar() {
  const pathname = usePathname();
  const meta = PAGE_META.find((m) => m.pattern.test(pathname));
  const title = meta?.title ?? "LearnAI";

  return (
    <header className="h-14 shrink-0 dark:bg-[#070d1a] bg-white border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between px-5 gap-4">
      <h1 className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{title}</h1>
      <div className="flex items-center gap-2 ml-auto">
        {/* 검색바 */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.05]">
          <span className="text-gray-400 dark:text-gray-600 text-xs">🔍</span>
          <input
            type="text"
            placeholder="강의, 퀴즈 검색..."
            className="bg-transparent outline-none text-xs text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-600 w-36"
          />
        </div>
        {meta?.action && (
          <Link
            href={meta.action.href}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
          >
            {meta.action.label}
          </Link>
        )}
        {/* 알림 버튼 */}
        <NotificationBell />
      </div>
    </header>
  );
}
