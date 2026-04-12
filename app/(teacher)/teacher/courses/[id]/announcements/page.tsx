import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAnnouncement, deleteAnnouncement } from "./actions";
import DeleteButton from "@/components/DeleteButton";

export default async function TeacherAnnouncementsPage({
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
    .select("id, title")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .single();
  if (!course) notFound();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, content, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  const createAction = async (formData: FormData) => {
    "use server";
    await createAnnouncement(courseId, formData);
  };

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/teacher" className="hover:text-gray-900 dark:hover:text-white transition-colors">강의 관리</Link>
        <span>/</span>
        <Link href={`/teacher/courses/${courseId}/materials`} className="hover:text-gray-900 dark:hover:text-white transition-colors truncate">{course.title}</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">공지사항</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">공지사항 관리</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {course.title} · 총 {announcements?.length ?? 0}개 공지
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/courses/${courseId}/materials`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
          >
            📚 학습 자료
          </Link>
          <Link
            href={`/teacher/courses/${courseId}/assignments`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
          >
            💻 코딩 과제
          </Link>
        </div>
      </div>

      {/* 공지 작성 폼 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4">새 공지 작성</h2>
        <form action={createAction} className="space-y-3">
          <input
            name="title"
            required
            placeholder="공지 제목"
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
          <textarea
            name="content"
            required
            rows={4}
            placeholder="공지 내용을 입력하세요..."
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              공지 등록
            </button>
          </div>
        </form>
      </div>

      {/* 공지 목록 */}
      <div className="space-y-3">
        {(announcements ?? []).length === 0 ? (
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 px-5 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
            등록된 공지가 없습니다.
          </div>
        ) : (
          (announcements ?? []).map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                      공지
                    </span>
                    <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {new Date(a.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <DeleteButton
                  action={async () => {
                    "use server";
                    await deleteAnnouncement(a.id, courseId);
                  }}
                  confirmMessage={`"${a.title}" 공지를 삭제하시겠습니까?`}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
