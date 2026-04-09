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

  const [
    { count: studentCount },
    { count: teacherCount },
    { count: courseCount },
    { count: enrollCount },
    { count: quizCount },
    { count: chatCount },
    { data: courses },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    admin.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.from("enrollments").select("id", { count: "exact", head: true }),
    admin.from("quizzes").select("id", { count: "exact", head: true }),
    admin.from("chat_messages").select("id", { count: "exact", head: true }).eq("role", "user"),
    admin
      .from("courses")
      .select("id, title, status, teacher_id, enrollments(count), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const aiStats = [
    { label: "AI 튜터 질문", value: `${chatCount ?? 0}회`, sub: "누적" },
    { label: "AI 생성 퀴즈", value: `${quizCount ?? 0}세트`, sub: "전체" },
    { label: "총 수강 등록", value: `${enrollCount ?? 0}건`, sub: "누적" },
  ];

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">전체 수강생</p>
          <p className="text-2xl font-bold">{studentCount ?? 0}명</p>
          <p className="text-gray-500 text-xs mt-1">교사 {teacherCount ?? 0}명 포함</p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">공개 강의</p>
          <p className="text-2xl font-bold">{courseCount ?? 0}개</p>
          <p className="text-gray-500 text-xs mt-1">운영 중</p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">총 수강 등록</p>
          <p className="text-2xl font-bold">{enrollCount ?? 0}건</p>
          <p className="text-gray-500 text-xs mt-1">누적</p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">AI 튜터 질문</p>
          <p className="text-2xl font-bold">{chatCount ?? 0}회</p>
          <p className="text-gray-500 text-xs mt-1">누적</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 강의별 현황 */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">강의별 현황</h2>
            <Link href="/admin/courses" className="text-xs text-purple-400 hover:text-purple-300">전체 보기</Link>
          </div>
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-xs text-gray-400">
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
                  const statusLabel = { published: "공개", draft: "초안", archived: "보관" }[c.status] ?? c.status;
                  return (
                    <tr key={c.id} className="border-b border-gray-700/30 last:border-0 hover:bg-gray-700/10 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[160px] truncate">{c.title}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{teacher?.full_name ?? "-"}</td>
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
        </div>

        {/* AI 활용 현황 */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">AI 활용 현황</h2>
          <div className="space-y-2">
            {aiStats.map((s) => (
              <div key={s.label} className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">{s.label}</span>
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
              <p className="text-xs text-gray-400 mt-0.5">수강생별 상세 분석 리포트</p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
