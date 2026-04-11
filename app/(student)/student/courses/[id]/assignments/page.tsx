import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  java: "Java",
  c: "C",
};

const LANG_COLOR: Record<string, string> = {
  python: "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800",
  java: "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
  c: "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
};

export default async function StudentAssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, total_weeks")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const totalWeeks: number = (course as unknown as { total_weeks: number }).total_weeks ?? 4;

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, language, deadline, week_number, created_at")
    .eq("course_id", courseId)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: true });

  // 내가 제출한 과제 ID 목록
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: mySubmissions } = assignmentIds.length > 0
    ? await supabase
        .from("assignment_submissions")
        .select("assignment_id, run_status, attempt")
        .eq("student_id", user.id)
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false })
    : { data: [] };

  // 과제별 최신 제출 상태
  const submissionMap = new Map<string, { run_status: string; attempt: number }>();
  for (const s of mySubmissions ?? []) {
    if (!submissionMap.has(s.assignment_id)) {
      submissionMap.set(s.assignment_id, { run_status: s.run_status, attempt: s.attempt });
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/student" className="hover:text-gray-900 dark:hover:text-white transition-colors">내 강의</Link>
        <span>/</span>
        <Link href={`/student/courses/${courseId}`} className="hover:text-gray-900 dark:hover:text-white transition-colors truncate">{course.title}</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">코딩 과제</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-bold">코딩 과제</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          {course.title} · 총 {assignments?.length ?? 0}개 과제
        </p>
      </div>

      {(assignments ?? []).length > 0 ? (
        <div className="space-y-4">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
            const weekAssignments = (assignments ?? []).filter(
              (a) => ((a as unknown as { week_number: number }).week_number ?? 1) === week
            );
            return (
              <div
                key={week}
                className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700/40">
                  <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                    {week}주차
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                      {weekAssignments.length}개 과제
                    </span>
                  </h2>
                </div>

                {weekAssignments.length > 0 ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
                    {weekAssignments.map((a) => {
                      const sub = submissionMap.get(a.id);
                      const isDeadlinePassed = a.deadline && new Date(a.deadline) < new Date();
                      const lang = (a as unknown as { language: string }).language;
                      return (
                        <Link
                          key={a.id}
                          href={`/student/courses/${courseId}/assignments/${a.id}`}
                          className="block px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-base shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                              💻
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-sm">{a.title}</h3>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${LANG_COLOR[lang] ?? ""}`}>
                                  {LANG_LABEL[lang] ?? lang}
                                </span>
                                {sub && (
                                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${
                                    sub.run_status === "success"
                                      ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-400/10 border-green-200 dark:border-green-400/30"
                                      : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/30"
                                  }`}>
                                    {sub.run_status === "success" ? "제출 완료" : "오류 있음"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                {a.deadline ? (
                                  <span className={isDeadlinePassed ? "text-red-500" : ""}>
                                    {isDeadlinePassed ? "마감됨" : "마감"}: {new Date(a.deadline).toLocaleDateString("ko-KR")}
                                  </span>
                                ) : (
                                  <span>마감일 없음</span>
                                )}
                                {sub && <span>· {sub.attempt}번 제출</span>}
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 group-hover:text-blue-500 transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                    {week}주차에 출제된 과제가 없습니다.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">아직 출제된 과제가 없습니다.</p>
        </div>
      )}
    </main>
  );
}
