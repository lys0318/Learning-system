"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_META: { pattern: RegExp; title: string; action?: { label: string; href: string } }[] = [
  { pattern: /^\/teacher$/, title: "강의 관리", action: { label: "+ 강의 생성", href: "/teacher/courses/new" } },
  { pattern: /^\/teacher\/courses\/new/, title: "강의 생성" },
  { pattern: /^\/teacher\/courses\/[^/]+\/materials/, title: "학습 자료" },
  { pattern: /^\/teacher\/courses\/[^/]+\/edit/, title: "강의 수정" },
  { pattern: /^\/teacher\/quizzes\/new/, title: "AI 퀴즈 생성" },
  { pattern: /^\/teacher\/quizzes\/[^/]+/, title: "퀴즈 상세" },
  { pattern: /^\/teacher\/quizzes/, title: "퀴즈 관리", action: { label: "+ AI 퀴즈 생성", href: "/teacher/quizzes/new" } },
  { pattern: /^\/teacher\/students/, title: "수강생 관리" },
  { pattern: /^\/teacher\/messages/, title: "학생 질문" },
  { pattern: /^\/teacher\/account/, title: "계정 관리" },
];

export default function TeacherTopbar() {
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
            placeholder="강의, 수강생 검색..."
            className="bg-transparent outline-none text-xs text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-600 w-36"
          />
        </div>
        {meta?.action && (
          <Link
            href={meta.action.href}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ background: "linear-gradient(135deg, #4338ca, #6366f1)" }}
          >
            {meta.action.label}
          </Link>
        )}
        {/* 알림 버튼 */}
        <button className="relative w-8 h-8 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors">
          🔔
        </button>
      </div>
    </header>
  );
}
