"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "./actions";

const ROLES = [
  { value: "student", label: "수강생", desc: "강의 수강 및 AI 튜터 이용" },
  { value: "teacher", label: "교사", desc: "강의 개설 및 퀴즈 생성" },
  { value: "admin", label: "운영자", desc: "전체 시스템 관리" },
];

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, null);

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
          <h2 className="text-xl font-semibold text-white mb-6">회원가입</h2>

          {state?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5" htmlFor="full_name">
                이름
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                placeholder="홍길동"
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

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
                placeholder="6자 이상"
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* 역할 선택 */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">역할 선택</label>
              <div className="space-y-2">
                {ROLES.map((role, idx) => (
                  <label
                    key={role.value}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-600 cursor-pointer hover:border-blue-500 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      defaultChecked={idx === 0}
                      className="accent-blue-500"
                    />
                    <div>
                      <p className="text-white text-sm font-medium">{role.label}</p>
                      <p className="text-gray-400 text-xs">{role.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors mt-2"
            >
              {isPending ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
