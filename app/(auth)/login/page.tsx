"use client";

import { useActionState, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";
import LogoIcon from "@/components/LogoIcon";

const ROLES = [
  { value: "student", label: "수강생", desc: "강의 수강 및 AI 튜터 이용", icon: "🎓" },
  { value: "teacher", label: "선생님", desc: "강의 개설 및 퀴즈 생성", icon: "👨‍🏫" },
  { value: "admin", label: "교육운영자", desc: "전체 시스템 관리", icon: "⚙️" },
];

function SignupSuccessBanner() {
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get("signup") === "success";
  if (!signupSuccess) return null;
  return (
    <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
      회원가입이 완료되었습니다. 로그인해주세요.
    </div>
  );
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [selectedRole, setSelectedRole] = useState("student");

  return (
    <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center p-4 relative overflow-hidden">
      {/* 배경 그라디언트 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,.12) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(16,185,129,.08) 0%, transparent 40%)",
        }}
      />
      {/* 플로팅 오브 */}
      <div
        className="absolute rounded-full pointer-events-none animate-pulse"
        style={{ width: 300, height: 300, top: -100, left: -100, background: "rgba(37,99,235,.12)", filter: "blur(60px)" }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 200, height: 200, bottom: -80, right: "10%", background: "rgba(99,102,241,.1)", filter: "blur(60px)" }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 150, height: 150, top: "40%", right: -50, background: "rgba(16,185,129,.08)", filter: "blur(60px)" }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <LogoIcon size={40} />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">LearnAI</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">AI-powered Learning Management System</p>
        </div>

        <div
          className="rounded-3xl p-8 border border-white/10"
          style={{
            background: "rgba(22,33,62,.85)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 25px 50px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.05)",
          }}
        >
          <h2 className="text-xl font-bold text-white mb-6">로그인</h2>

          {/* 역할 선택 */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">역할 선택</p>
            <div className="grid grid-cols-3 gap-2.5">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all ${
                    selectedRole === role.value
                      ? "border-blue-500 bg-blue-500/20 text-white shadow-[0_0_20px_rgba(37,99,235,.25)]"
                      : "border-[#2a3a5c] bg-[rgba(15,52,96,.4)] text-gray-400 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-gray-200"
                  }`}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <span className="text-xs font-semibold">{role.label}</span>
                  <span className={`text-[9.5px] text-center leading-tight ${selectedRole === role.value ? "text-blue-300" : "text-gray-600"}`}>
                    {role.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Suspense>
            <SignupSuccessBanner />
          </Suspense>

          {state?.error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="role" value={selectedRole} />

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="email">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="example@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#1e3a5f] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,.15)] transition-all"
                style={{ background: "rgba(15,52,96,.6)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="password">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#1e3a5f] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,.15)] transition-all"
                style={{ background: "rgba(15,52,96,.6)" }}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-wide transition-all mt-1 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(37,99,235,.5)]"
              style={{
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                boxShadow: "0 4px 15px rgba(37,99,235,.4)",
              }}
            >
              {isPending ? "로그인 중..." : `${ROLES.find((r) => r.value === selectedRole)?.label}으로 로그인`}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
