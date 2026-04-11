import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminStudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  const [
    { data: students },
    { data: allEnrollments },
    { data: allQuizResults },
    { data: allChats },
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name, created_at").eq("role", "student").order("full_name"),
    admin.from("enrollments").select("student_id, course_id, progress, status, enrolled_at"),
    admin.from("quiz_results").select("student_id, score, created_at").order("created_at", { ascending: false }),
    admin.from("chat_messages").select("student_id, created_at").eq("role", "user").order("created_at", { ascending: false }),
  ]);

  type StudentStat = {
    id: string;
    name: string;
    courseCount: number;
    completedCount: number;
    avgProgress: number;
    attendanceRate: number;
    avgQuizScore: number | null;
    lastScore: number | null;
    attritionRisk: number;
    lastActivityDays: number;
  };

  const stats: StudentStat[] = (students ?? []).map((s) => {
    const myEnrollments = (allEnrollments ?? []).filter((e) => e.student_id === s.id);
    const avgProgress = myEnrollments.length > 0
      ? Math.round(myEnrollments.reduce((sum, e) => sum + e.progress, 0) / myEnrollments.length)
      : 0;
    const completedCount = myEnrollments.filter((e) => e.status === "completed").length;

    // 퀴즈 점수
    const myQuizzes = (allQuizResults ?? []).filter((r) => r.student_id === s.id);
    const avgQuizScore = myQuizzes.length > 0
      ? Math.round(myQuizzes.reduce((sum, r) => sum + r.score, 0) / myQuizzes.length)
      : null;
    const lastScore = myQuizzes[0]?.score ?? null; // created_at desc 정렬

    // 마지막 활동일
    const myChats = (allChats ?? []).filter((c) => c.student_id === s.id);
    const lastQuizDate = myQuizzes[0]?.created_at ?? null;
    const lastChatDate = myChats[0]?.created_at ?? null;
    const dates = [lastQuizDate, lastChatDate].filter(Boolean) as string[];
    const lastActivity = dates.length > 0 ? dates.sort().reverse()[0] : null;
    const lastActivityDays = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // 출석률: 활동한 날(채팅+퀴즈 유니크 날짜) / 수강 등록 이후 경과일
    const firstEnrolled = myEnrollments.length > 0
      ? myEnrollments.map((e) => e.enrolled_at).sort()[0]
      : null;
    const daysEnrolled = firstEnrolled
      ? Math.max(1, Math.floor((Date.now() - new Date(firstEnrolled).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const chatDays = new Set(myChats.map((c) => c.created_at.slice(0, 10)));
    const quizDays = new Set(myQuizzes.map((r) => r.created_at.slice(0, 10)));
    const activeDays = new Set([...chatDays, ...quizDays]).size;
    const attendanceRate = myEnrollments.length > 0
      ? Math.min(100, Math.round((activeDays / daysEnrolled) * 100))
      : 0;

    // 이탈 위험도 (0~100)
    let risk = 0;
    if (myEnrollments.length === 0) {
      risk = 0;
    } else {
      if (avgProgress < 20) risk += 35;
      else if (avgProgress < 50) risk += 15;

      if (lastActivityDays > 14) risk += 40;
      else if (lastActivityDays > 7) risk += 20;

      if (myQuizzes.length === 0) risk += 15;
      else if (avgQuizScore !== null && avgQuizScore < 50) risk += 10;

      if (attendanceRate < 20 && daysEnrolled > 7) risk += 10;
    }
    const attritionRisk = Math.min(100, risk);

    return {
      id: s.id,
      name: s.full_name,
      courseCount: myEnrollments.length,
      completedCount,
      avgProgress,
      attendanceRate,
      avgQuizScore,
      lastScore,
      attritionRisk,
      lastActivityDays,
    };
  }).sort((a, b) => b.attritionRisk - a.attritionRisk); // 위험도 높은 순

  const highRiskCount = stats.filter((s) => s.attritionRisk >= 60).length;
  const medRiskCount = stats.filter((s) => s.attritionRisk >= 30 && s.attritionRisk < 60).length;
  const avgAttendance = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + s.attendanceRate, 0) / stats.length)
    : 0;
  const avgQuiz = stats.filter((s) => s.avgQuizScore !== null);
  const overallAvgQuiz = avgQuiz.length > 0
    ? Math.round(avgQuiz.reduce((sum, s) => sum + (s.avgQuizScore ?? 0), 0) / avgQuiz.length)
    : null;

  function riskBadge(risk: number) {
    if (risk >= 60) return { label: "고위험", color: "text-red-400 bg-red-400/10 border-red-400/30" };
    if (risk >= 30) return { label: "주의", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
    return { label: "양호", color: "text-green-400 bg-green-400/10 border-green-400/30" };
  }

  function riskBar(risk: number) {
    const color = risk >= 60 ? "bg-red-500" : risk >= 30 ? "bg-yellow-500" : "bg-green-500";
    return { color, width: `${risk}%` };
  }

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">전체 수강생</p>
          <p className="text-2xl font-bold">{stats.length}명</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">등록된 계정</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-red-500/30 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">이탈 위험 수강생</p>
          <p className="text-2xl font-bold text-red-400">{highRiskCount}명</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">주의 {medRiskCount}명 포함</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">평균 출석률</p>
          <p className="text-2xl font-bold text-blue-400">{avgAttendance}%</p>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgAttendance}%` }} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">평균 퀴즈 점수</p>
          <p className="text-2xl font-bold text-indigo-400">
            {overallAvgQuiz !== null ? `${overallAvgQuiz}점` : "-"}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">퀴즈 응시자 기준</p>
        </div>
      </div>

      {/* 수강생 모니터링 테이블 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">수강생 모니터링</h2>
          <p className="text-xs text-gray-500">이탈 위험도 높은 순</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
          {stats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700/50 text-xs text-gray-400">
                    <th className="text-left px-4 py-3 font-medium">수강생</th>
                    <th className="text-center px-3 py-3 font-medium">수강 강의</th>
                    <th className="text-center px-3 py-3 font-medium">이탈 위험도</th>
                    <th className="text-center px-3 py-3 font-medium">출석률</th>
                    <th className="text-center px-3 py-3 font-medium">평균 진도</th>
                    <th className="text-center px-3 py-3 font-medium">마지막 점수</th>
                    <th className="text-center px-3 py-3 font-medium">평균 퀴즈</th>
                    <th className="text-right px-4 py-3 font-medium">마지막 활동</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => {
                    const badge = riskBadge(s.attritionRisk);
                    const bar = riskBar(s.attritionRisk);
                    return (
                      <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700/30 last:border-0 hover:bg-gray-700/10 transition-colors">
                        {/* 수강생 */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-xs font-medium text-indigo-300 shrink-0">
                              {s.name.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-sm leading-tight">{s.name}</p>
                              <p className="text-gray-500 text-xs">완강 {s.completedCount}개</p>
                            </div>
                          </div>
                        </td>

                        {/* 수강 강의 */}
                        <td className="px-3 py-3 text-center text-xs text-gray-600 dark:text-gray-300">{s.courseCount}개</td>

                        {/* 이탈 위험도 */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold ${s.attritionRisk >= 60 ? "text-red-400" : s.attritionRisk >= 30 ? "text-yellow-400" : "text-green-400"}`}>
                                {s.attritionRisk}%
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-20">
                              <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
                            </div>
                          </div>
                        </td>

                        {/* 출석률 */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-semibold ${s.attendanceRate >= 60 ? "text-blue-400" : s.attendanceRate >= 30 ? "text-yellow-400" : "text-gray-500"}`}>
                              {s.attendanceRate}%
                            </span>
                            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-20">
                              <div
                                className={`h-full rounded-full ${s.attendanceRate >= 60 ? "bg-blue-500" : s.attendanceRate >= 30 ? "bg-yellow-500" : "bg-gray-600"}`}
                                style={{ width: `${s.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 평균 진도 */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{s.avgProgress}%</span>
                            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-20">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.avgProgress}%` }} />
                            </div>
                          </div>
                        </td>

                        {/* 마지막 점수 */}
                        <td className="px-3 py-3 text-center">
                          {s.lastScore !== null ? (
                            <span className={`text-sm font-bold ${s.lastScore >= 70 ? "text-green-400" : s.lastScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              {s.lastScore}점
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">미응시</span>
                          )}
                        </td>

                        {/* 평균 퀴즈 점수 */}
                        <td className="px-3 py-3 text-center">
                          {s.avgQuizScore !== null ? (
                            <span className={`text-sm font-bold ${s.avgQuizScore >= 70 ? "text-green-400" : s.avgQuizScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              {s.avgQuizScore}점
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </td>

                        {/* 마지막 활동 */}
                        <td className="px-4 py-3 text-right">
                          {s.lastActivityDays === 999 ? (
                            <span className="text-gray-600 text-xs">활동 없음</span>
                          ) : s.lastActivityDays === 0 ? (
                            <span className="text-green-400 text-xs font-medium">오늘</span>
                          ) : (
                            <span className={`text-xs ${s.lastActivityDays > 14 ? "text-red-400" : s.lastActivityDays > 7 ? "text-yellow-400" : "text-gray-400"}`}>
                              {s.lastActivityDays}일 전
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-10">등록된 수강생이 없습니다.</p>
          )}
        </div>
      </div>

      {/* 지표 설명 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">지표 산정 기준</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs text-gray-500">
          <div>
            <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">🚨 이탈 위험도</p>
            <ul className="space-y-0.5 leading-relaxed">
              <li>· 평균 진도 20% 미만: +35점</li>
              <li>· 14일 이상 미접속: +40점</li>
              <li>· 7~14일 미접속: +20점</li>
              <li>· 퀴즈 미응시: +15점 / 평균 50점 미만: +10점</li>
              <li>· 출석률 20% 미만 (7일 이상 경과): +10점</li>
            </ul>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">📅 출석률</p>
            <ul className="space-y-0.5 leading-relaxed">
              <li>· AI 튜터 채팅 또는 퀴즈 응시가 있었던 날짜</li>
              <li>· 수강 등록 이후 경과일 대비 활동 일수 비율</li>
              <li>· 마지막 점수: 가장 최근 퀴즈 점수</li>
              <li>· 평균 퀴즈: 전체 응시 퀴즈 평균 점수</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
