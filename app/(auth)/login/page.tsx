"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";

const ROLES = [
  { value: "student", label: "수강생", desc: "강의 수강 및 AI 튜터 이용", icon: "🎓" },
  { value: "teacher", label: "선생님", desc: "강의 개설 및 퀴즈 생성", icon: "👨‍🏫" },
  { value: "admin", label: "교육운영자", desc: "전체 시스템 관리", icon: "⚙️" },
];

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get("signup") === "success";
  const [selectedRole, setSelectedRole] = useState("student");

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">LearnAI</h1>
          <p className="text-gray-400 text-sm mt-1">AI-powered LMS</p>
        </div>

        <div className="bg-[#16213e] rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-xl font-semibold text-white mb-6">로그인</h2>

          {/* 역할 선택 */}
          <div className="mb-6">
            <p className="text-sm text-gray-300 mb-3">역할을 선택하세요</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    selectedRole === role.value
                      ? "border-blue-500 bg-blue-500/15 text-white"
                      : "border-gray-600 bg-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  }`}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <span className="text-xs font-medium">{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          {signupSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              회원가입이 완료되었습니다. 로그인해주세요.
            </div>
          )}

          {state?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="role" value={selectedRole} />

            <div>
              <label className="block text-sm text-gray-300 mb-1.5" htmlFor="email">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="example@email.com"
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5" htmlFor="password">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="비밀번호 입력"
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors mt-2"
            >
              {isPending ? "로그인 중..." : `${ROLES.find((r) => r.value === selectedRole)?.label}으로 로그인`}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
