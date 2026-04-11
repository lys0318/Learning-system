import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminTeachersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  const [
    { data: teachers },
    { data: allRatings },
    { data: allCourses },
    { data: allEnrollments },
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name, created_at").eq("role", "teacher").order("full_name"),
    admin.from("teacher_ratings").select("teacher_id, rating"),
    admin.from("courses").select("id, teacher_id, title, status"),
    admin.from("enrollments").select("course_id, student_id, status"),
  ]);

  type TeacherStat = {
    id: string;
    name: string;
    courseCount: number;
    publishedCount: number;
    studentCount: number;
    completionRate: number;
    avgRating: number | null;
    ratingCount: number;
    qualityScore: number;
  };

  const teacherStats: TeacherStat[] = (teachers ?? []).map((t) => {
    const myCourses = (allCourses ?? []).filter((c) => c.teacher_id === t.id);
    const myCourseIds = new Set(myCourses.map((c) => c.id));
    const myEnrollments = (allEnrollments ?? []).filter((e) => myCourseIds.has(e.course_id));
    const uniqueStudents = new Set(myEnrollments.map((e) => e.student_id)).size;
    const completedCount = myEnrollments.filter((e) => e.status === "completed").length;
    const completionRate = myEnrollments.length > 0
      ? Math.round((completedCount / myEnrollments.length) * 100)
      : 0;
    const myRatings = (allRatings ?? []).filter((r) => r.teacher_id === t.id);
    const avgRating = myRatings.length > 0
      ? Math.round((myRatings.reduce((s, r) => s + r.rating, 0) / myRatings.length) * 10) / 10
      : null;

    // 품질 점수: 평점(60%) + 수료율(40%)
    const ratingScore = avgRating !== null ? (avgRating / 5) * 60 : 30;
    const completionScore = (completionRate / 100) * 40;
    const qualityScore = Math.round(ratingScore + completionScore);

    return {
      id: t.id,
      name: t.full_name,
      courseCount: myCourses.length,
      publishedCount: myCourses.filter((c) => c.status === "published").length,
      studentCount: uniqueStudents,
      completionRate,
      avgRating,
      ratingCount: myRatings.length,
      qualityScore,
    };
  }).sort((a, b) => b.qualityScore - a.qualityScore);

  const avgQuality = teacherStats.length > 0
    ? Math.round(teacherStats.reduce((s, t) => s + t.qualityScore, 0) / teacherStats.length)
    : 0;
  const topTeacher = teacherStats[0] ?? null;
  const lowRiskCount = teacherStats.filter((t) => t.qualityScore >= 70).length;

  function qualityBadge(score: number) {
    if (score >= 80) return { label: "우수", color: "text-green-400 bg-green-400/10 border-green-400/30" };
    if (score >= 60) return { label: "양호", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
    if (score >= 40) return { label: "보통", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
    return { label: "관리필요", color: "text-red-400 bg-red-400/10 border-red-400/30" };
  }

  function stars(rating: number | null) {
    if (rating === null) return <span className="text-gray-600 text-xs">평가 없음</span>;
    const full = Math.floor(rating);
    const empty = 5 - full;
    return (
      <span className="text-yellow-400 text-sm tracking-tight">
        {"★".repeat(full)}{"☆".repeat(empty)}
        <span className="text-gray-400 text-xs ml-1">{rating.toFixed(1)}</span>
      </span>
    );
  }

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">전체 강사</p>
          <p className="text-2xl font-bold">{teacherStats.length}명</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">등록된 강사</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">평균 품질 점수</p>
          <p className="text-2xl font-bold text-purple-400">{avgQuality}점</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">평점 60% + 수료율 40%</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">우수 강사</p>
          <p className="text-2xl font-bold text-green-400">{lowRiskCount}명</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">품질 점수 70점 이상</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">최우수 강사</p>
          <p className="text-lg font-bold truncate">{topTeacher?.name ?? "-"}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            {topTeacher ? `품질 ${topTeacher.qualityScore}점` : "데이터 없음"}
          </p>
        </div>
      </div>

      {/* 강사 목록 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">강사 품질 모니터링</h2>
          <p className="text-xs text-gray-500">품질 점수 기준 내림차순</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
          {teacherStats.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/50 text-xs text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">강사명</th>
                  <th className="text-center px-3 py-3 font-medium">강의</th>
                  <th className="text-center px-3 py-3 font-medium">수강생</th>
                  <th className="text-left px-4 py-3 font-medium">평점</th>
                  <th className="text-center px-3 py-3 font-medium">수료율</th>
                  <th className="text-center px-3 py-3 font-medium">품질점수</th>
                  <th className="text-center px-3 py-3 font-medium">등급</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((t, i) => {
                  const badge = qualityBadge(t.qualityScore);
                  return (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700/30 last:border-0 hover:bg-gray-700/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-900 flex items-center justify-center text-xs font-medium text-purple-300 shrink-0">
                            {t.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            <p className="text-gray-500 text-xs">공개 {t.publishedCount}개</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-gray-600 dark:text-gray-300">{t.courseCount}개</td>
                      <td className="px-3 py-3 text-center text-xs text-gray-600 dark:text-gray-300">{t.studentCount}명</td>
                      <td className="px-4 py-3">
                        <div>
                          {stars(t.avgRating)}
                          {t.ratingCount > 0 && (
                            <p className="text-gray-600 text-xs mt-0.5">{t.ratingCount}개 평가</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div>
                          <span className={`text-xs font-semibold ${t.completionRate >= 60 ? "text-green-400" : t.completionRate >= 30 ? "text-yellow-400" : "text-red-400"}`}>
                            {t.completionRate}%
                          </span>
                          <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-16 mx-auto">
                            <div
                              className={`h-full rounded-full ${t.completionRate >= 60 ? "bg-green-500" : t.completionRate >= 30 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${t.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{t.qualityScore}</span>
                          {i === 0 && <span className="text-yellow-400 text-xs">🏆</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-sm text-center py-10">등록된 강사가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 품질 기준 안내 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">품질 점수 산정 기준</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { label: "우수", range: "80점 이상", color: "text-green-400", desc: "탁월한 수업 품질" },
            { label: "양호", range: "60~79점", color: "text-blue-400", desc: "기준 충족" },
            { label: "보통", range: "40~59점", color: "text-yellow-400", desc: "개선 권장" },
            { label: "관리필요", range: "40점 미만", color: "text-red-400", desc: "즉각 개입 필요" },
          ].map((g) => (
            <div key={g.label} className="bg-gray-100 dark:bg-gray-800/40 rounded-lg p-3">
              <p className={`font-semibold ${g.color}`}>{g.label} ({g.range})</p>
              <p className="text-gray-500 mt-0.5">{g.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3">* 품질 점수 = 평점(최대 60점) + 수료율(최대 40점)</p>
      </div>
    </main>
  );
}
