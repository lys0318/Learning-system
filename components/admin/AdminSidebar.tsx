"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/logout/actions";

const NAV = [
  { href: "/admin", label: "전체 현황", exact: true },
  { href: "/admin/analytics", label: "학습 분석", exact: false },
  { href: "/admin/courses", label: "강의 관리", exact: false },
];

export default function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initial = userName.slice(0, 2) || "AD";

  return (
    <aside className="w-56 shrink-0 bg-[#0d1224] border-r border-gray-700/50 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
            AI
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">LearnAI</p>
            <p className="text-gray-500 text-xs">AI-powered LMS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-purple-600/20 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-purple-400" : "bg-gray-600"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700/50">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center text-xs font-medium text-purple-300 shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{userName}</p>
            <p className="text-xs text-gray-500">교육운영자</p>
          </div>
        </div>
        <div className="space-y-1">
          <Link
            href="/admin/account"
            className={`block w-full px-3 py-2 rounded-lg text-xs transition-colors text-left ${
              pathname === "/admin/account"
                ? "bg-purple-600/20 text-white font-medium"
                : "bg-gray-700/40 hover:bg-gray-600/40 text-gray-400 hover:text-gray-200"
            }`}
          >
            계정 관리
          </Link>
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 text-gray-400 hover:text-gray-200 text-xs transition-colors text-left"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
