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

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">전체 수강생</p>
          <p className="text-2xl font-bold">{studentCount ?? 0}명</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">강사 {teacherCount ?? 0}명 포함</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">공개 강의</p>
          <p className="text-2xl font-bold">{courseCount ?? 0}개</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">운영 중</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">전체 수료율</p>
          <p className="text-2xl font-bold text-green-400">{completionRate}%</p>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">AI 생성 퀴즈</p>
          <p className="text-2xl font-bold">{quizCount ?? 0}개</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">전체</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">AI 튜터 질문</p>
          <p className="text-2xl font-bold">{chatCount ?? 0}회</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">누적</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 강의별 현황 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">강의별 현황</h2>
            <Link href="/admin/courses" className="text-xs text-purple-400 hover:text-purple-300">전체 보기</Link>
          </div>
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">강의명</th>
                  <th className="text-left px-4 py-3 font-medium">교사</th>
                  <th className="text-right px-4 py-3 font-medium">수강생</th>
                  <th className="text-left px-4 py-3 font-medium">상태</th>
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
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/30 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/10 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[160px] truncate">{c.title}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{teacher?.full_name ?? "-"}</td>
                      <td className="px-4 py-3 text-right text-xs">{enrollCnt}명</td>
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
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">이탈 위험 수강생</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                  {atRisk.length}명
                </span>
              </div>
              <p className="text-xs text-gray-500">등록 7일 이상 · 진도 30% 미만</p>
            </div>
            <div className="bg-white dark:bg-[#16213e] rounded-xl border border-red-500/20 overflow-hidden">
              {atRisk.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700/50 text-gray-400">
                      <th className="text-left px-4 py-2.5 font-medium">수강생</th>
                      <th className="text-left px-4 py-2.5 font-medium">강의</th>
                      <th className="text-right px-4 py-2.5 font-medium">진도</th>
                      <th className="text-right px-4 py-2.5 font-medium">등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRisk.map((e, i) => {
                      const daysSince = Math.floor((Date.now() - new Date(e.enrolled_at).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/30 last:border-0">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{e.profiles?.full_name ?? "-"}</td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{e.courses?.title ?? "-"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-red-400 font-semibold">{e.progress}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-400 dark:text-gray-500">{daysSince}일 전</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-xs text-center py-6">이탈 위험 수강생이 없습니다 🎉</p>
              )}
            </div>
          </div>
        </div>

        {/* 우측 사이드 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 수료 현황 요약 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">수료 현황</h2>
            <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">전체 수강 등록</span>
                <span className="font-semibold">{totalEnroll}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">수료 완료</span>
                <span className="font-semibold text-green-400">{completedEnroll}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">진행 중</span>
                <span className="font-semibold text-blue-400">{totalEnroll - completedEnroll}건</span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700/50">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  <span>전체 수료율</span>
                  <span className="text-green-400 font-semibold">{completionRate}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI 활용 현황 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">AI 활용 현황</h2>
            <div className="space-y-2">
              {[
                { label: "AI 튜터 질문", value: `${chatCount ?? 0}회`, sub: "누적" },
                { label: "AI 생성 퀴즈", value: `${quizCount ?? 0}세트`, sub: "전체" },
                { label: "총 수강 등록", value: `${totalEnroll}건`, sub: "누적" },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.sub}</p>
                  </div>
                </div>
              ))}
              <Link
                href="/admin/analytics"
                className="block bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-colors"
              >
                <p className="text-sm font-medium">📊 학습 분석 보기</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">수강생별 상세 분석 리포트</p>
              </Link>
              <Link
                href="/admin/teachers"
                className="block bg-gradient-to-r from-orange-600/10 to-amber-600/10 border border-orange-500/20 rounded-xl p-4 hover:border-orange-500/40 transition-colors"
              >
                <p className="text-sm font-medium">⭐ 강사 품질 모니터링</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">강사별 평점 및 수료율 분석</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
