import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  java: "Java",
  c: "C",
};

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string; aid: string }>;
}) {
  const { id: courseId, aid: assignmentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, language, description")
    .eq("id", assignmentId)
    .eq("teacher_id", user.id)
    .single();
  if (!assignment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();

  // 각 학생별 최신 제출만 가져오기
  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("id, student_id, code, attempt, run_stdout, run_stderr, run_status, ai_feedback, submitted_at, profiles!student_id(full_name)")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  // 학생별 최신 제출 하나씩만 추출
  const latestByStudent = new Map<string, typeof submissions extends (infer T)[] | null ? T : never>();
  for (const s of submissions ?? []) {
    if (!latestByStudent.has(s.student_id)) {
      latestByStudent.set(s.student_id, s);
    }
  }
  const latestSubmissions = Array.from(latestByStudent.values());

  return (
    <main className="max-w-5xl mx-auto px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/teacher" className="hover:text-gray-900 dark:hover:text-white transition-colors">강의 관리</Link>
        <span>/</span>
        <Link href={`/teacher/courses/${courseId}/assignments`} className="hover:text-gray-900 dark:hover:text-white transition-colors truncate">{course?.title}</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white truncate">{assignment.title}</span>
      </nav>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold">{assignment.title}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {LANG_LABEL[assignment.language] ?? assignment.language}
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          제출 학생 {latestSubmissions.length}명 · 전체 제출 {submissions?.length ?? 0}건
        </p>
      </div>

      {latestSubmissions.length > 0 ? (
        <div className="space-y-4">
          {latestSubmissions.map((s) => {
            const studentProfile = (s.profiles as unknown) as { full_name: string } | null;
            const isSuccess = s.run_status === "success";
            return (
              <details key={s.id} className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden group">
                <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/10 transition-colors list-none">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{studentProfile?.full_name ?? "학생"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        isSuccess
                          ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-400/10 border-green-200 dark:border-green-400/30"
                          : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-400/10 border-red-200 dark:border-red-400/30"
                      }`}>
                        {isSuccess ? "실행 성공" : "오류"}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{s.attempt}번째 제출</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(s.submitted_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">클릭하여 펼치기 ▼</span>
                </summary>

                <div className="border-t border-gray-100 dark:border-gray-700/50 px-5 py-4 space-y-4">
                  {/* 제출 코드 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">제출 코드</p>
                    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                      {s.code}
                    </pre>
                  </div>

                  {/* 실행 결과 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">실행 출력 (stdout)</p>
                      <pre className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 font-mono min-h-[60px] overflow-x-auto">
                        {s.run_stdout || "(출력 없음)"}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">오류 (stderr)</p>
                      <pre className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 font-mono min-h-[60px] overflow-x-auto">
                        {s.run_stderr || "(없음)"}
                      </pre>
                    </div>
                  </div>

                  {/* AI 피드백 */}
                  {s.ai_feedback && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">AI 피드백</p>
                      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{s.ai_feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">아직 제출한 학생이 없습니다.</p>
        </div>
      )}
    </main>
  );
}
