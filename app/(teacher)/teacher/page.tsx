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
    .select("id, title, description, status, created_at, enrollments(count)")
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

  // 전체 수강생 수 (내 강의 기준)
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

  // 최근 수강생 목록 (최대 5명)
  const { data: recentEnrollments } = courseIds.length > 0
    ? await supabase
        .from("enrollments")
        .select("student_id, progress, status, enrolled_at, courses(title), profiles(full_name)")
        .in("course_id", courseIds)
        .order("enrolled_at", { ascending: false })
        .limit(5)
    : { data: [] };

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">담당 강의</p>
          <p className="text-2xl font-bold">{courses?.length ?? 0}개</p>
          <p className="text-gray-500 text-xs mt-1">
            공개 {courses?.filter((c) => c.status === "published").length ?? 0}개
          </p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">총 수강생</p>
          <p className="text-2xl font-bold">{uniqueStudents}명</p>
          <p className="text-gray-500 text-xs mt-1">전체 강의 합산</p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">평균 진도율</p>
          <p className="text-2xl font-bold">{avgProgress}%</p>
          <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">AI 생성 퀴즈</p>
          <p className="text-2xl font-bold">{quizzes?.length ?? 0}개</p>
          <p className="text-gray-500 text-xs mt-1">전체 퀴즈 수</p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">평균 평점</p>
          <p className="text-2xl font-bold">
            {avgRating !== null ? (
              <span className="text-yellow-400">{avgRating.toFixed(1)}</span>
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {(ratings ?? []).length > 0 ? `${(ratings ?? []).length}개 평가` : "아직 평가 없음"}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 강의 목록 (3/5) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">내 강의 목록</h2>
            <Link
              href="/teacher/courses/new"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium transition-colors"
            >
              + 강의 생성
            </Link>
          </div>

          {courses && courses.length > 0 ? (
            <div className="space-y-2">
              {courses.map((course) => {
                const enrollCount = (course.enrollments as { count: number }[])[0]?.count ?? 0;
                const s = STATUS_LABEL[course.status] ?? STATUS_LABEL.draft;
                return (
                  <div
                    key={course.id}
                    className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{course.title}</h3>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">수강생 {enrollCount}명</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/teacher/courses/${course.id}/materials`}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 text-xs text-gray-300 transition-colors"
                      >
                        자료
                      </Link>
                      <Link
                        href={`/teacher/courses/${course.id}/edit`}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 text-xs text-gray-300 transition-colors"
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
          ) : (
            <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-10 text-center">
              <p className="text-gray-400 mb-4 text-sm">아직 개설한 강의가 없습니다.</p>
              <Link
                href="/teacher/courses/new"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                첫 강의 만들기
              </Link>
            </div>
          )}
        </div>

        {/* 최근 수강생 + AI 인사이트 (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300">최근 수강생</h2>
              <Link href="/teacher/students" className="text-xs text-blue-400 hover:text-blue-300">전체 보기</Link>
            </div>
            <div className="bg-[#16213e] rounded-xl border border-gray-700/50 overflow-hidden">
              {(recentEnrollments ?? []).length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">이름</th>
                      <th className="text-left px-4 py-2.5 text-gray-400 font-medium">강의</th>
                      <th className="text-right px-4 py-2.5 text-gray-400 font-medium">진도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentEnrollments ?? []).map((e, i) => {
                      const p = (e.profiles as unknown) as { full_name: string } | null;
                      const c = (e.courses as unknown) as { title: string } | null;
                      return (
                        <tr key={i} className="border-b border-gray-700/30 last:border-0">
                          <td className="px-4 py-2.5 text-white font-medium truncate max-w-[80px]">{p?.full_name ?? "-"}</td>
                          <td className="px-4 py-2.5 text-gray-400 truncate max-w-[80px]">{c?.title ?? "-"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-medium ${e.progress >= 70 ? "text-green-400" : e.progress >= 40 ? "text-blue-400" : "text-yellow-400"}`}>
                              {e.progress}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-xs text-center py-6">수강생이 없습니다</p>
              )}
            </div>
          </div>

          {/* AI 인사이트 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-3">AI 인사이트</h2>
            <div className="space-y-2">
              <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
                <p className="text-xs text-gray-400 mb-1">퀴즈 현황</p>
                <p className="text-sm font-medium">
                  {(quizzes?.length ?? 0) > 0
                    ? `AI 퀴즈 ${quizzes?.length}개 생성됨`
                    : "아직 퀴즈가 없습니다"}
                </p>
                <Link href="/teacher/quizzes/new" className="text-xs text-blue-400 hover:text-blue-300 mt-1 block">
                  새 퀴즈 생성 →
                </Link>
              </div>
              <div className="bg-[#16213e] rounded-xl border border-blue-500/20 p-4">
                <p className="text-xs text-gray-400 mb-1">💡 추천</p>
                <p className="text-sm font-medium">수강생 학습 자료를 업로드하고 AI 퀴즈를 생성해보세요</p>
                <Link href="/teacher/quizzes/new" className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium transition-colors">
                  AI 퀴즈 생성
                </Link>
              </div>
            </div>
          </div>

          {/* 최근 평가 */}
          {(ratings ?? []).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">최근 수강생 평가</h2>
              <div className="space-y-2">
                {(ratings ?? []).slice(0, 3).map((r, i) => (
                  <div key={i} className="bg-[#16213e] rounded-xl border border-gray-700/50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">익명</span>
                      <span className="text-yellow-400 text-xs">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{r.comment}</p>
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
