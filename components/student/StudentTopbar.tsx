"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_META: { pattern: RegExp; title: string; action?: { label: string; href: string } }[] = [
  { pattern: /^\/student$/, title: "학습 대시보드" },
  { pattern: /^\/student\/my-courses/, title: "내 강의" },
  { pattern: /^\/student\/ai-tutor/, title: "AI 튜터" },
  { pattern: /^\/student\/courses\/[^/]+\/chat/, title: "AI 튜터" },
  { pattern: /^\/student\/courses\/[^/]+$/, title: "강의 자료" },
  { pattern: /^\/student\/courses$/, title: "강의 둘러보기" },
  { pattern: /^\/student\/quizzes\/[^/]+/, title: "퀴즈 풀기" },
  { pattern: /^\/student\/quizzes/, title: "퀴즈" },
  { pattern: /^\/student\/account/, title: "계정 관리" },
];

export default function StudentTopbar() {
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
