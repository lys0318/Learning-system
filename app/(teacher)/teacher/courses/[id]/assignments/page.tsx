import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAssignment } from "./actions";
import DeleteButton from "@/components/DeleteButton";

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  java: "Java",
  c: "C",
};

export default async function TeacherAssignmentsPage({
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
  if (profile?.role !== "teacher") redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, total_weeks")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .single();
  if (!course) notFound();

  const totalWeeks: number = (course as unknown as { total_weeks: number }).total_weeks ?? 4;

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, language, deadline, week_number, created_at")
    .eq("course_id", courseId)
    .eq("teacher_id", user.id)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/teacher" className="hover:text-gray-900 dark:hover:text-white transition-colors">강의 관리</Link>
        <span>/</span>
        <Link href={`/teacher/courses/${courseId}/materials`} className="hover:text-gray-900 dark:hover:text-white transition-colors truncate">{course.title}</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">코딩 과제</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">코딩 과제 관리</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {course.title} · 총 {assignments?.length ?? 0}개 과제
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/courses/${courseId}/announcements`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
          >
            📢 공지
          </Link>
          <Link
            href={`/teacher/courses/${courseId}/assignments/new`}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            + 과제 출제
          </Link>
        </div>
      </div>

      {/* 주차별 섹션 */}
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
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700/40">
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
                    return (
                      <div
                        key={a.id}
                        className="px-5 py-3 flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-medium text-sm truncate">{a.title}</h3>
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {LANG_LABEL[a.language] ?? a.language}
                            </span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {a.deadline
                              ? `마감: ${new Date(a.deadline).toLocaleDateString("ko-KR")}`
                              : "마감일 없음"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/teacher/courses/${courseId}/assignments/${a.id}/submissions`}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
                          >
                            제출 현황
                          </Link>
                          <DeleteButton
                            action={async () => {
                              "use server";
                              await deleteAssignment(a.id, courseId);
                            }}
                            confirmMessage={`"${a.title}" 과제를 삭제하시겠습니까?`}
                          />
                        </div>
                      </div>
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
    </main>
  );
}
