import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCourse } from "./actions";
import DeleteButton from "@/components/DeleteButton";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "초안",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  published: { label: "공개",   color: "text-green-400  bg-green-400/10  border-green-400/30"  },
  archived:  { label: "보관",   color: "text-gray-400   bg-gray-400/10   border-gray-400/30"   },
};

export default async function TeacherPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, status, category, created_at, enrollments(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id")
    .eq("teacher_id", user.id);

  const { data: ratings } = await supabase
    .from("teacher_ratings")
    .select("rating, comment, course_id")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const avgRating = (ratings ?? []).length > 0
    ? Math.round(((ratings ?? []).reduce((s, r) => s + r.rating, 0) / (ratings ?? []).length) * 10) / 10
    : null;

  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: enrollmentRows } = courseIds.length > 0
    ? await supabase
        .from("enrollments")
        .select("student_id, progress")
        .in("course_id", courseIds)
    : { data: [] };

  const uniqueStudents = new Set((enrollmentRows ?? []).map((e) => e.student_id)).size;
  const avgProgress = (enrollmentRows ?? []).length > 0
    ? Math.round((enrollmentRows ?? []).reduce((s, e) => s + e.progress, 0) / (enrollmentRows ?? []).length)
    : 0;

  const { data: recentEnrollments } = courseIds.length > 0
    ? await supabase
        .from("enrollments")
        .select("student_id, progress, status, enrolled_at, courses(title), profiles(full_name)")
        .in("course_id", courseIds)
        .order("enrolled_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const firstName = (profile?.full_name ?? "").split(" ").pop() ?? profile?.full_name ?? "";

  return (
    <main className="px-5 py-5 space-y-5">
      {/* 웰컴 배너 */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between relative overflow-hidden border border-indigo-500/20"
        style={{ background: "linear-gradient(135deg, rgba(67,56,202,.12) 0%, rgba(99,102,241,.12) 100%)" }}
      >
        <div className="absolute right-16 top-1/2 -translate-y-1/2 text-5xl opacity-10 pointer-events-none select-none">👨‍🏫</div>
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">
            안녕하세요, {firstName} 선생님! 👋
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            현재 {courses?.length ?? 0}개 강의를 운영 중입니다. 오늘도 수고 많으세요.
          </p>
        </div>
        <Link
          href="/teacher/courses/new"
          className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg, #4338ca, #6366f1)", boxShadow: "0 4px 15px rgba(99,102,241,.35)" }}
        >
          + 강의 생성
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: "📋", label: "담당 강의", value: `${courses?.length ?? 0}개`, sub: `공개 ${courses?.filter((c) => c.status === "published").length ?? 0}개`, glow: "#6366f1", iconBg: "rgba(99,102,241,.2)", subColor: "text-indigo-400" },
          { icon: "👥", label: "총 수강생", value: `${uniqueStudents}명`, sub: "전체 강의 합산", glow: "#3b82f6", iconBg: "rgba(59,130,246,.2)", subColor: "text-blue-400" },
          { icon: "📈", label: "평균 진도율", value: `${avgProgress}%`, sub: null, glow: "#10b981", iconBg: "rgba(16,185,129,.2)", subColor: "text-emerald-400" },
          { icon: "🧠", label: "AI 생성 퀴즈", value: `${quizzes?.length ?? 0}개`, sub: "전체 퀴즈 수", glow: "#f59e0b", iconBg: "rgba(245,158,11,.2)", subColor: "text-amber-400" },
          { icon: "⭐", label: "평균 평점", value: avgRating !== null ? `${avgRating.toFixed(1)}` : "-", sub: `${(ratings ?? []).length > 0 ? `${(ratings ?? []).length}개 평가` : "아직 평가 없음"}`, glow: "#eab308", iconBg: "rgba(234,179,8,.2)", subColor: "text-yellow-400" },
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
            {stat.sub !== null && (
              i === 2 ? (
                <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${avgProgress}%` }} />
                </div>
              ) : (
                <p className={`text-[11px] ${stat.subColor}`}>{stat.sub}</p>
              )
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* 강의 목록 */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">내 강의 목록</h2>
            <Link
              href="/teacher/courses/new"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ background: "linear-gradient(135deg, #4338ca, #6366f1)" }}
            >
              + 강의 생성
            </Link>
          </div>

          {courses && courses.length > 0 ? (() => {
            const grouped: Record<string, typeof courses> = {};
            for (const c of courses) {
              const cat = (c as unknown as { category: string | null }).category ?? "미분류";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(c);
            }
            const categoryOrder = Object.keys(grouped).sort((a, b) =>
              a === "미분류" ? 1 : b === "미분류" ? -1 : a.localeCompare(b, "ko")
            );
            return (
              <div className="space-y-4">
                {categoryOrder.map((cat) => (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wide">{cat}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-600">({grouped[cat].length})</span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.06]" />
                    </div>
                    <div className="space-y-2">
                      {grouped[cat].map((course) => {
                        const enrollCount = (course.enrollments as { count: number }[])[0]?.count ?? 0;
                        const s = STATUS_LABEL[course.status] ?? STATUS_LABEL.draft;
                        return (
                          <div
                            key={course.id}
                            className="rounded-2xl border border-white/[0.07] p-4 flex items-start gap-3 transition-all hover:border-white/[0.12]"
                            style={{ background: "#0d1b35" }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-sm truncate text-gray-900 dark:text-white">{course.title}</h3>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                                  {s.label}
                                </span>
                              </div>
                              <p className="text-gray-500 dark:text-gray-500 text-xs">수강생 {enrollCount}명</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link
                                href={`/teacher/courses/${course.id}/materials`}
                                className="px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-white/[0.1] hover:border-indigo-500/50 dark:hover:border-indigo-500/50 text-xs text-gray-600 dark:text-gray-400 transition-colors"
                              >
                                자료
                              </Link>
                              <Link
                                href={`/teacher/courses/${course.id}/edit`}
                                className="px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-white/[0.1] hover:border-indigo-500/50 dark:hover:border-indigo-500/50 text-xs text-gray-600 dark:text-gray-400 transition-colors"
                              >
                                수정
                              </Link>
                              <DeleteButton
                                action={async () => {
                                  "use server";
                                  await deleteCourse(course.id);
                                }}
                                confirmMessage="강의를 삭제하시겠습니까?"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })() : (
            <div
              className="rounded-2xl border border-white/[0.07] p-10 text-center"
              style={{ background: "#0d1b35" }}
            >
              <p className="text-gray-500 dark:text-gray-500 mb-4 text-sm">아직 개설한 강의가 없습니다.</p>
              <Link
                href="/teacher/courses/new"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #4338ca, #6366f1)" }}
              >
                첫 강의 만들기
              </Link>
            </div>
          )}
        </div>

        {/* 최근 수강생 + AI 인사이트 */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">최근 수강생</h2>
              <Link href="/teacher/students" className="text-xs text-indigo-400 hover:text-indigo-300">전체 보기 →</Link>
            </div>
            <div
              className="rounded-2xl border border-white/[0.07] overflow-hidden"
              style={{ background: "#0d1b35" }}
            >
              {(recentEnrollments ?? []).length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">이름</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">강의</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wide text-[10px]">진도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentEnrollments ?? []).map((e, i) => {
                      const p = (e.profiles as unknown) as { full_name: string } | null;
                      const c = (e.courses as unknown) as { title: string } | null;
                      return (
                        <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5 text-gray-900 dark:text-white font-semibold truncate max-w-[80px]">{p?.full_name ?? "-"}</td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500 truncate max-w-[80px]">{c?.title ?? "-"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-bold ${e.progress >= 70 ? "text-emerald-400" : e.progress >= 40 ? "text-blue-400" : "text-yellow-400"}`}>
                              {e.progress}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 dark:text-gray-500 text-xs text-center py-6">수강생이 없습니다</p>
              )}
            </div>
          </div>

          {/* AI 인사이트 */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">AI 인사이트</h2>
            <div className="space-y-2">
              <div
                className="rounded-2xl border border-white/[0.07] p-4"
                style={{ background: "#0d1b35" }}
              >
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">퀴즈 현황</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {(quizzes?.length ?? 0) > 0
                    ? `AI 퀴즈 ${quizzes?.length}개 생성됨`
                    : "아직 퀴즈가 없습니다"}
                </p>
                <Link href="/teacher/quizzes/new" className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 block">
                  새 퀴즈 생성 →
                </Link>
              </div>
              <div
                className="rounded-2xl border border-indigo-500/20 p-4"
                style={{ background: "linear-gradient(135deg, rgba(67,56,202,.1), rgba(99,102,241,.1))" }}
              >
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">💡 추천</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">수강생 학습 자료를 업로드하고 AI 퀴즈를 생성해보세요</p>
                <Link
                  href="/teacher/quizzes/new"
                  className="mt-2 inline-block px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
                  style={{ background: "linear-gradient(135deg, #4338ca, #6366f1)" }}
                >
                  AI 퀴즈 생성
                </Link>
              </div>
            </div>
          </div>

          {/* 최근 평가 */}
          {(ratings ?? []).length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">최근 수강생 평가</h2>
              <div className="space-y-2">
                {(ratings ?? []).slice(0, 3).map((r, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/[0.07] p-3"
                    style={{ background: "#0d1b35" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">익명</span>
                      <span className="text-yellow-400 text-xs">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-gray-400 dark:text-gray-400 leading-relaxed line-clamp-2">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
