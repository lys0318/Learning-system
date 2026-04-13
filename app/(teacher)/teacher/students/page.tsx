import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import StudentCareAdvisorClient from "@/components/teacher/StudentCareAdvisorClient";

export default async function TeacherStudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("teacher_id", user.id);

  const courseIds = (courses ?? []).map((c) => c.id);
  const courseMap: Record<string, string> = {};
  (courses ?? []).forEach((c) => { courseMap[c.id] = c.title; });

  const admin = createAdminClient();

  const { data: enrollments } = courseIds.length > 0
    ? await admin
        .from("enrollments")
        .select("student_id, course_id, progress, status, enrolled_at")
        .in("course_id", courseIds)
        .order("enrolled_at", { ascending: false })
    : { data: [] };

  // 수강생 ID 목록
  const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id))];

  const { data: studentProfiles } = studentIds.length > 0
    ? await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds)
    : { data: [] };

  const profileMap: Record<string, { full_name: string; email: string }> = {};
  (studentProfiles ?? []).forEach((p) => { profileMap[p.id] = p; });

  // 퀴즈 결과 (평균 점수)
  const { data: quizResults } = studentIds.length > 0
    ? await admin
        .from("quiz_results")
        .select("student_id, score")
        .in("student_id", studentIds)
    : { data: [] };

  const scoreMap: Record<string, number[]> = {};
  (quizResults ?? []).forEach((r) => {
    if (!scoreMap[r.student_id]) scoreMap[r.student_id] = [];
    scoreMap[r.student_id].push(r.score);
  });

  function getAvgScore(studentId: string) {
    const scores = scoreMap[studentId];
    if (!scores || scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // 과제 목록 (강의별)
  const { data: assignments } = courseIds.length > 0
    ? await admin
        .from("assignments")
        .select("id, course_id")
        .in("course_id", courseIds)
    : { data: [] };

  // 강의별 과제 수
  const assignmentCountByCourse: Record<string, number> = {};
  (assignments ?? []).forEach((a) => {
    assignmentCountByCourse[a.course_id] = (assignmentCountByCourse[a.course_id] ?? 0) + 1;
  });

  // 과제 제출 현황
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: submissions } = assignmentIds.length > 0 && studentIds.length > 0
    ? await admin
        .from("assignment_submissions")
        .select("assignment_id, student_id")
        .in("assignment_id", assignmentIds)
        .in("student_id", studentIds)
    : { data: [] };

  // (studentId, courseId) 별 제출한 과제 수 (중복 제거)
  const submissionKey = new Set<string>();
  const submittedCountMap: Record<string, Record<string, number>> = {};
  for (const s of submissions ?? []) {
    const asgn = (assignments ?? []).find((a) => a.id === s.assignment_id);
    if (!asgn) continue;
    const key = `${s.student_id}__${asgn.course_id}__${s.assignment_id}`;
    if (submissionKey.has(key)) continue;
    submissionKey.add(key);
    if (!submittedCountMap[s.student_id]) submittedCountMap[s.student_id] = {};
    submittedCountMap[s.student_id][asgn.course_id] =
      (submittedCountMap[s.student_id][asgn.course_id] ?? 0) + 1;
  }

  function getAssignmentStatus(studentId: string, courseId: string) {
    const total = assignmentCountByCourse[courseId] ?? 0;
    const done = submittedCountMap[studentId]?.[courseId] ?? 0;
    return { total, done };
  }

  function getStatus(progress: number) {
    if (progress >= 80) return { label: "우수", color: "text-green-400 bg-green-400/10 border-green-400/30" };
    if (progress >= 40) return { label: "보통", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
    return { label: "관심필요", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
  }

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 요약 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">총 수강생</p>
          <p className="text-2xl font-bold">{studentIds.length}명</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">평균 진도율</p>
          <p className="text-2xl font-bold">
            {(enrollments ?? []).length > 0
              ? Math.round((enrollments ?? []).reduce((s, e) => s + e.progress, 0) / (enrollments ?? []).length)
              : 0}%
          </p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">담당 강의</p>
          <p className="text-2xl font-bold">{courses?.length ?? 0}개</p>
        </div>
      </div>

      {/* AI 수강생 케어 어시스턴트 */}
      <StudentCareAdvisorClient
        students={(enrollments ?? []).map((e) => {
          const p = profileMap[e.student_id];
          const { total, done } = { total: assignmentCountByCourse[e.course_id] ?? 0, done: submittedCountMap[e.student_id]?.[e.course_id] ?? 0 };
          return {
            studentId: e.student_id,
            studentName: p?.full_name ?? "알 수 없음",
            courseId: e.course_id,
            courseName: courseMap[e.course_id] ?? "-",
            progress: e.progress,
            avgQuizScore: getAvgScore(e.student_id),
            assignmentDone: done,
            assignmentTotal: total,
          };
        })}
      />

      {/* 수강생 테이블 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold">수강생 전체 목록</h2>
        </div>
        {(enrollments ?? []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/50 text-xs text-gray-400">
                  <th className="text-left px-5 py-3 font-medium">이름</th>
                  <th className="text-left px-5 py-3 font-medium">수강 강의</th>
                  <th className="text-left px-5 py-3 font-medium">진도율</th>
                  <th className="text-left px-5 py-3 font-medium">퀴즈 평균</th>
                  <th className="text-left px-5 py-3 font-medium">과제 제출</th>
                  <th className="text-left px-5 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {(enrollments ?? []).map((e, i) => {
                  const p = profileMap[e.student_id];
                  const courseName = courseMap[e.course_id] ?? "-";
                  const avgScore = getAvgScore(e.student_id);
                  const st = getStatus(e.progress);
                  return (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/30 last:border-0 hover:bg-gray-700/10 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-900/60 flex items-center justify-center text-xs text-blue-300 font-medium shrink-0">
                            {(p?.full_name ?? "?").slice(0, 2)}
                          </div>
                          <span className="font-medium">{p?.full_name ?? "알 수 없음"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[160px] truncate">{courseName}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${e.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-300">{e.progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {avgScore !== null ? (
                          <span className={avgScore >= 70 ? "text-green-400" : "text-yellow-400"}>
                            {avgScore}점
                          </span>
                        ) : (
                          <span className="text-gray-500">미응시</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {(() => {
                          const { total, done } = getAssignmentStatus(e.student_id, e.course_id);
                          if (total === 0) return <span className="text-gray-500">과제 없음</span>;
                          const allDone = done >= total;
                          return (
                            <span className={allDone ? "text-green-400" : done > 0 ? "text-blue-400" : "text-gray-500"}>
                              {done}/{total} 제출
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            아직 수강생이 없습니다.
          </div>
        )}
      </div>
    </main>
  );
}
