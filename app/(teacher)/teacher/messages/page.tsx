import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // 내 강의에 온 모든 메시지 (학생별로 그룹핑)
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

      // 학생 이름 조회
      const { data: sp } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", msg.student_id)
        .single();

      threads.push({
        courseId: msg.course_id,
        courseTitle: course?.title ?? "",
        studentId: msg.student_id,
        studentName: sp?.full_name ?? "수강생",
        lastContent: msg.content,
        lastAt: msg.created_at,
      });
    }
  }

  return (
    <main className="px-6 py-6 max-w-2xl">
      <h1 className="text-lg font-semibold mb-5">학생 질문 메시지</h1>

      {threads.length === 0 ? (
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-16 text-center text-gray-400">
          아직 학생 질문이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={`${t.courseId}:${t.studentId}`}
              href={`/teacher/messages/${t.courseId}/${t.studentId}`}
              className="flex items-center gap-4 bg-[#16213e] hover:bg-[#1a2540] rounded-xl border border-gray-700/50 px-4 py-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 text-sm font-bold shrink-0">
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
              <span className="text-gray-600 shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
