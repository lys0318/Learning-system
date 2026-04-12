import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StudentAnnouncementsPage({
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

  // 수강 여부 확인
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) notFound();

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("id, title, profiles!teacher_id(full_name)")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const teacher = (course.profiles as unknown) as { full_name: string } | null;

  const { data: announcements } = await admin
    .from("announcements")
    .select("id, title, content, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/student" className="hover:text-white transition-colors">내 강의</Link>
        <span>/</span>
        <Link href={`/student/courses/${courseId}`} className="hover:text-white transition-colors truncate">{course.title}</Link>
        <span>/</span>
        <span className="text-white">공지사항</span>
      </nav>

      {/* 강의 헤더 */}
      <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{course.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {teacher?.full_name ? `${teacher.full_name} 선생님` : "선생님"} · 공지사항
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/student/courses/${courseId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              📚 강의 자료
            </Link>
            <Link
              href={`/student/courses/${courseId}/assignments`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              💻 과제
            </Link>
            <Link
              href={`/student/courses/${courseId}/chat`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-sm font-medium transition-colors"
            >
              🎓 AI 튜터
            </Link>
          </div>
        </div>
      </div>

      {/* 공지 목록 */}
      <div className="space-y-3">
        {(announcements ?? []).length === 0 ? (
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 px-5 py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">등록된 공지가 없습니다.</p>
          </div>
        ) : (
          (announcements ?? []).map((a, i) => (
            <div
              key={a.id}
              className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                  공지 {(announcements ?? []).length - i}
                </span>
                <h3 className="font-semibold text-sm">{a.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{a.content}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                {new Date(a.created_at).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
