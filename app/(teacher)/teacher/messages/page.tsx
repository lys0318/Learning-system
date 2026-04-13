import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import NewChatModal from "@/components/teacher/NewChatModal";

export default async function TeacherMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") redirect("/login");

  // 내 강의 목록
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("teacher_id", user.id);

  const courseIds = (courses ?? []).map((c) => c.id);

  const admin = createAdminClient();

  // 강의별 수강생 목록 (새 채팅 시작용)
  const { data: enrollments } = courseIds.length > 0
    ? await admin
        .from("enrollments")
        .select("student_id, course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id))];

  const { data: studentProfiles } = studentIds.length > 0
    ? await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds)
    : { data: [] };

  const profileMap: Record<string, string> = {};
  (studentProfiles ?? []).forEach((p) => { profileMap[p.id] = p.full_name ?? "수강생"; });

  // 강의별 수강생 구조 (NewChatModal용)
  const coursesWithStudents = (courses ?? []).map((c) => {
    const cStudents = (enrollments ?? [])
      .filter((e) => e.course_id === c.id)
      .map((e) => ({ id: e.student_id, name: profileMap[e.student_id] ?? "수강생" }));
    // 중복 학생 제거
    const seen = new Set<string>();
    return {
      courseId: c.id,
      courseTitle: c.title,
      students: cStudents.filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; }),
    };
  }).filter((c) => c.students.length > 0);

  // 기존 대화 스레드
  const threads: {
    courseId: string;
    courseTitle: string;
    studentId: string;
    studentName: string;
    lastContent: string;
    lastAt: string;
  }[] = [];

  if (courseIds.length > 0) {
    const { data: msgs } = await admin
      .from("direct_messages")
      .select("course_id, student_id, content, created_at")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false });

    const seen = new Set<string>();
    for (const msg of msgs ?? []) {
      const key = `${msg.course_id}:${msg.student_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const course = (courses ?? []).find((c) => c.id === msg.course_id);
      const studentName = profileMap[msg.student_id] ?? "수강생";

      threads.push({
        courseId: msg.course_id,
        courseTitle: course?.title ?? "",
        studentId: msg.student_id,
        studentName,
        lastContent: msg.content,
        lastAt: msg.created_at,
      });
    }
  }

  return (
    <main className="px-6 py-6 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold">학생과의 채팅</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            학생에게 먼저 메시지를 보내거나 질문에 답변하세요
          </p>
        </div>
        <NewChatModal courses={coursesWithStudents} />
      </div>

      {/* 대화 목록 */}
      {threads.length === 0 ? (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center">
          <p className="text-gray-400 text-sm mb-2">아직 대화가 없습니다.</p>
          <p className="text-gray-500 dark:text-gray-600 text-xs">
            위 <strong>새 채팅 시작</strong> 버튼으로 학생에게 먼저 메시지를 보내보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={`${t.courseId}:${t.studentId}`}
              href={`/teacher/messages/${t.courseId}/${t.studentId}`}
              className="flex items-center gap-4 bg-white dark:bg-[#16213e] hover:bg-gray-50 dark:hover:bg-[#1a2540] rounded-xl border border-gray-200 dark:border-gray-700/50 px-4 py-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-900/60 flex items-center justify-center text-indigo-300 text-sm font-bold shrink-0">
                {t.studentName.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{t.studentName}</p>
                  <p className="text-xs text-gray-500 shrink-0">
                    {new Date(t.lastAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.courseTitle}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{t.lastContent}</p>
              </div>
              <span className="text-gray-400 shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
