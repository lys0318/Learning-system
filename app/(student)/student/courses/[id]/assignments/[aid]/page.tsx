import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssignmentClient from "@/components/student/AssignmentClient";

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  java: "Java",
  c: "C",
};

export default async function AssignmentDetailPage({
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
  if (profile?.role !== "student") redirect("/login");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) notFound();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, language, description, starter_code, deadline")
    .eq("id", assignmentId)
    .eq("course_id", courseId)
    .single();
  if (!assignment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();

  // 이전 제출 기록 (최근 5개)
  const { data: history } = await supabase
    .from("assignment_submissions")
    .select("id, attempt, run_status, submitted_at")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(5);

  const isDeadlinePassed = assignment.deadline && new Date(assignment.deadline) < new Date();

  return (
    <main className="max-w-4xl mx-auto px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/student" className="hover:text-gray-900 dark:hover:text-white transition-colors">내 강의</Link>
        <span>/</span>
        <Link href={`/student/courses/${courseId}`} className="hover:text-gray-900 dark:hover:text-white transition-colors truncate">{course?.title}</Link>
        <span>/</span>
        <Link href={`/student/courses/${courseId}/assignments`} className="hover:text-gray-900 dark:hover:text-white transition-colors">과제</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white truncate">{assignment.title}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 왼쪽: 문제 지문 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <h1 className="font-bold text-base">{assignment.title}</h1>
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {LANG_LABEL[assignment.language] ?? assignment.language}
              </span>
            </div>

            {assignment.deadline && (
              <p className={`text-xs mb-4 ${isDeadlinePassed ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                {isDeadlinePassed ? "⚠️ 마감됨" : "🕐 마감"}: {new Date(assignment.deadline).toLocaleString("ko-KR")}
              </p>
            )}

            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs">
              {assignment.description}
            </div>
          </div>

          {/* 제출 이력 */}
          {(history ?? []).length > 0 && (
            <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">최근 제출 이력</h3>
              <div className="space-y-2">
                {(history ?? []).map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{h.attempt}번째</span>
                    <span className={h.run_status === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {h.run_status === "success" ? "성공" : "오류"}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {new Date(h.submitted_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 코드 에디터 */}
        <div className="lg:col-span-2">
          <AssignmentClient
            assignmentId={assignment.id}
            language={assignment.language}
            description={assignment.description}
            starterCode={assignment.starter_code ?? ""}
          />
        </div>
      </div>
    </main>
  );
}
