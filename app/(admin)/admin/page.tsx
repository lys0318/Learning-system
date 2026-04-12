import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: studentCount },
    { count: teacherCount },
    { count: courseCount },
    { count: quizCount },
    { count: chatCount },
    { data: courses },
    { data: allEnrollments },
    { data: atRiskRaw },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    admin.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.from("quizzes").select("id", { count: "exact", head: true }),
    admin.from("chat_messages").select("id", { count: "exact", head: true }).eq("role", "user"),
    admin
      .from("courses")
      .select("id, title, status, teacher_id, enrollments(count), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(6),
    admin.from("enrollments").select("status"),
    admin
      .from("enrollments")
      .select("progress, enrolled_at, student_id, course_id, profiles!student_id(full_name), courses(title)")
      .eq("status", "active")
      .lt("progress", 30)
      .lt("enrolled_at", sevenDaysAgo)
      .order("progress", { ascending: true })
      .limit(8),
  ]);

  const totalEnroll = (allEnrollments ?? []).length;
  const completedEnroll = (allEnrollments ?? []).filter((e) => e.status === "completed").length;
  const completionRate = totalEnroll > 0 ? Math.round((completedEnroll / totalEnroll) * 100) : 0;

  type AtRisk = {
    progress: number;
    enrolled_at: string;
    student_id: string;
    course_id: string;
    profiles: { full_name: string } | null;
    courses: { title: string } | null;
  };
  const atRisk = (atRiskRaw ?? []) as unknown as AtRisk[];

  const firstName = (profile?.full_name ?? "").split(" ").pop() ?? profile?.full_name ?? "";

  return (
    <main className="px-5 py-5 space-y-5">
      {/* 웰컴 배너 */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between relative overflow-hidden border border-purple-500/20"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,.12) 0%, rgba(147,51,234,.12) 100%)" }}
      >
        <div className="absolute right-16 top-1/2 -translate-y-1/2 text-5xl opacity-10 pointer-events-none select-none">⚙️</div>
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">
            안녕하세요, {firstName} 운영자님! 👋
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            전체 수강생 {studentCount ?? 0}명 · 공개 강의 {courseCount ?? 0}개 운영 중입니다.
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", boxShadow: "0 4px 15px rgba(124,58,237,.35)" }}
        >
          학습 분석 보기 →
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: "👥", label: "전체 수강생", value: `${studentCount ?? 0}명`, sub: `강사 ${teacherCount ?? 0}명 포함`, glow: "#7c3aed", iconBg: "rgba(124,58,237,.2)", subColor: "text-purple-400" },
          { icon: "📋", label: "공개 강의", value: `${courseCount ?? 0}개`, sub: "운영 중", glow: "#3b82f6", iconBg: "rgba(59,130,246,.2)", subColor: "text-blue-400" },
          { icon: "🏆", label: "전체 수료율", value: `${completionRate}%`, sub: null, glow: "#10b981", iconBg: "rgba(16,185,129,.2)", subColor: "text-emerald-400" },
          { icon: "🧠", label: "AI 생성 퀴즈", value: `${quizCount ?? 0}개`, sub: "전체", glow: "#f59e0b", iconBg: "rgba(245,158,11,.2)", subColor: "text-amber-400" },
          { icon: "🤖", label: "AI 튜터 질문", value: `${chatCount ?? 0}회`, sub: "누적", glow: "#6366f1", iconBg: "rgba(99,102,241,.2)", subColor: "text-indigo-400" },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.07] p-4 relative overflow-hidden transition-all hover:-translate-y-0.5"
            style={{ background: "#0d1b35" }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-50 -translate-y-8 translate-x-8 pointer-events-none" style={{ background: stat.glow, filter: "blur(30px)" }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3" style={{ background: stat.iconBg }}>
              {stat.icon}
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 mb-2">{stat.label}</p>
            {stat.sub !== null ? (
              i === 2 ? (
                <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                </div>
              ) : (
                <p className={`text-[11px] ${stat.subColor}`}>{stat.sub}</p>
              )
            ) : (
              <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* 강의별 현황 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">강의별 현황</h2>
            <Link href="/admin/courses" className="text-xs text-purple-400 hover:text-purple-300">전체 보기 →</Link>
          </div>
          <div
            className="rounded-2xl border border-white/[0.07] overflow-hidden"
            style={{ background: "#0d1b35" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">강의명</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">교사</th>
                  <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">수강생</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">상태</th>
                </tr>
              </thead>
              <tbody>
                {(courses ?? []).map((c) => {
                  const teacher = (c.profiles as unknown) as { full_name: string } | null;
                  const enrollCnt = (c.enrollments as { count: number }[])[0]?.count ?? 0;
                  const statusColor = c.status === "published"
                    ? "text-green-400 bg-green-400/10 border-green-400/30"
                    : c.status === "draft"
                    ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                    : "text-gray-400 bg-gray-400/10 border-gray-400/30";
                  const statusLabel = ({ published: "공개", draft: "초안", archived: "보관" } as Record<string, string>)[c.status] ?? c.status;
                  return (
                    <tr key={c.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white max-w-[160px] truncate text-xs">{c.title}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-500 text-xs">{teacher?.full_name ?? "-"}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-400">{enrollCnt}명</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })}
                {(courses ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-xs">강의가 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 이탈 위험 수강생 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">이탈 위험 수강생</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                  {atRisk.length}명
                </span>
              </div>
              <p className="text-xs text-gray-500">등록 7일 이상 · 진도 30% 미만</p>
            </div>
            <div
              className="rounded-2xl border border-red-500/20 overflow-hidden"
              style={{ background: "#0d1b35" }}
            >
              {atRisk.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">수강생</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">강의</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">진도</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRisk.map((e, i) => {
                      const daysSince = Math.floor((Date.now() - new Date(e.enrolled_at).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{e.profiles?.full_name ?? "-"}</td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500 max-w-[120px] truncate">{e.courses?.title ?? "-"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-red-400 font-bold">{e.progress}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-600">{daysSince}일 전</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 dark:text-gray-500 text-xs text-center py-6">이탈 위험 수강생이 없습니다 🎉</p>
              )}
            </div>
          </div>
        </div>

        {/* 우측 사이드 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 수료 현황 요약 */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">수료 현황</h2>
            <div
              className="rounded-2xl border border-white/[0.07] p-4 space-y-3"
              style={{ background: "#0d1b35" }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-500 text-xs">전체 수강 등록</span>
                <span className="font-bold text-gray-900 dark:text-white text-xs">{totalEnroll}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-500 text-xs">수료 완료</span>
                <span className="font-bold text-emerald-400 text-xs">{completedEnroll}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-500 text-xs">진행 중</span>
                <span className="font-bold text-blue-400 text-xs">{totalEnroll - completedEnroll}건</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 dark:text-gray-500">전체 수료율</span>
                  <span className="text-emerald-400 font-bold">{completionRate}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI 활용 현황 */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">AI 활용 현황</h2>
            <div className="space-y-2">
              {[
                { label: "AI 튜터 질문", value: `${chatCount ?? 0}회`, sub: "누적", icon: "🤖" },
                { label: "AI 생성 퀴즈", value: `${quizCount ?? 0}세트`, sub: "전체", icon: "🧠" },
                { label: "총 수강 등록", value: `${totalEnroll}건`, sub: "누적", icon: "📚" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/[0.07] p-3.5 flex items-center gap-3"
                  style={{ background: "#0d1b35" }}
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 flex-1">{s.label}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                    <p className="text-[10px] text-gray-600">{s.sub}</p>
                  </div>
                </div>
              ))}
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 rounded-2xl border border-purple-500/20 p-4 hover:border-purple-500/40 transition-colors"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,.1), rgba(99,102,241,.1))" }}
              >
                <span className="text-lg">📊</span>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">학습 분석 보기</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">수강생별 상세 분석 리포트</p>
                </div>
              </Link>
              <Link
                href="/admin/teachers"
                className="flex items-center gap-3 rounded-2xl border border-amber-500/20 p-4 hover:border-amber-500/40 transition-colors"
                style={{ background: "linear-gradient(135deg, rgba(245,158,11,.08), rgba(239,68,68,.08))" }}
              >
                <span className="text-lg">⭐</span>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">강사 품질 모니터링</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">강사별 평점 및 수료율 분석</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
