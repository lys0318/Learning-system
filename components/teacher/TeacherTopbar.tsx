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
  { pattern: /^\/teacher\/account/, title: "계정 관리" },
];

export default function TeacherTopbar() {
  const pathname = usePathname();
  const meta = PAGE_META.find((m) => m.pattern.test(pathname));
  const title = meta?.title ?? "LearnAI";

  return (
    <header className="h-14 shrink-0 bg-[#0d1224] border-b border-gray-700/50 flex items-center justify-between px-6">
      <h1 className="text-sm font-semibold text-white">{title}</h1>
      {meta?.action && (
        <Link
          href={meta.action.href}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium transition-colors"
        >
          {meta.action.label}
        </Link>
      )}
    </header>
  );
}
