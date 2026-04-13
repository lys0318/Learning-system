"use client";

import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

const TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/admin$/, title: "전체 현황" },
  { pattern: /^\/admin\/analytics/, title: "학습 분석" },
  { pattern: /^\/admin\/courses/, title: "강의 관리" },
  { pattern: /^\/admin\/students/, title: "수강생 모니터링" },
  { pattern: /^\/admin\/teachers/, title: "강사 모니터링" },
  { pattern: /^\/admin\/marketing/, title: "AI 마케팅 조언" },
  { pattern: /^\/admin\/account/, title: "계정 관리" },
];

export default function AdminTopbar() {
  const pathname = usePathname();
  const meta = TITLES.find((m) => m.pattern.test(pathname));
  const title = meta?.title ?? "관리자";

  return (
    <header className="h-14 shrink-0 dark:bg-[#070d1a] bg-white border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between px-5 gap-4">
      <h1 className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{title}</h1>
      <div className="flex items-center gap-2 ml-auto">
        {/* 검색바 */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.05]">
          <span className="text-gray-400 dark:text-gray-600 text-xs">🔍</span>
          <input
            type="text"
            placeholder="수강생, 강의 검색..."
            className="bg-transparent outline-none text-xs text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-600 w-36"
          />
        </div>
        {/* 알림 버튼 */}
        <NotificationBell />
      </div>
    </header>
  );
}
