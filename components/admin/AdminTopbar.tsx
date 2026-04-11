"use client";

import { usePathname } from "next/navigation";

const TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/admin$/, title: "전체 현황" },
  { pattern: /^\/admin\/analytics/, title: "학습 분석" },
  { pattern: /^\/admin\/courses/, title: "강의 관리" },
  { pattern: /^\/admin\/account/, title: "계정 관리" },
];

export default function AdminTopbar() {
  const pathname = usePathname();
  const meta = TITLES.find((m) => m.pattern.test(pathname));
  const title = meta?.title ?? "관리자";

  return (
    <header className="h-14 shrink-0 bg-white dark:bg-[#0d1224] border-b border-gray-200 dark:border-gray-700/50 flex items-center px-6">
      <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h1>
    </header>
  );
}
