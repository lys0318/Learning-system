import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StudentMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  // 수강 중인 강의 목록 (각 강의마다 선생님과 대화 가능)
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("courses(id, title, teacher_id, profiles!teacher_id(full_name))")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  // 각 강의의 마지막 메시지 조회
  const admin = createAdminClient();
  const courseIds = (enrollments ?? []).map((e) => {
    const c = (e.courses as unknown) as { id: string } | null;
    return c?.id ?? "";
  }).filter(Boolean);

  const lastMessages: Record<string, { content: string; created_at: string }> = {};
  if (courseIds.length > 0) {
    const { data: msgs } = await admin
      .from("direct_messages")
      .select("course_id, content, created_at")
      .eq("student_id", user.id)
      .in("course_id", courseIds)
      .order("created_at", { ascending: false });

    for (const msg of msgs ?? []) {
      if (!lastMessages[msg.course_id]) {
        lastMessages[msg.course_id] = { content: msg.content, created_at: msg.created_at };
      }
    }
  }

  const threads = (enrollments ?? []).map((e) => {
    const c = (e.courses as unknown) as {
      id: string;
      title: string;
      profiles: { full_name: string } | null;
    } | null;
    return {
      courseId: c?.id ?? "",
      courseTitle: c?.title ?? "",
      teacherName: c?.profiles?.full_name ?? null,
      last: lastMessages[c?.id ?? ""] ?? null,
    };
  }).filter((t) => t.courseId !== "");

  return (
    <main className="px-6 py-6 max-w-2xl">
      <h1 className="text-lg font-semibold mb-5">선생님께 질문하기</h1>

      {threads.length === 0 ? (
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-16 text-center text-gray-400">
          수강 중인 강의가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.courseId}
              href={`/student/messages/${t.courseId}`}
              className="flex items-center gap-4 bg-[#16213e] hover:bg-[#1a2540] rounded-xl border border-gray-700/50 px-4 py-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 text-sm font-bold shrink-0">
                {(t.teacherName ?? "선생님").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{t.teacherName ? `${t.teacherName} 선생님` : "선생님"}</p>
                  {t.last && (
                    <p className="text-xs text-gray-500 shrink-0">
                      {new Date(t.last.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.courseTitle}</p>
                {t.last && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t.last.content}</p>
                )}
              </div>
              <span className="text-gray-600 shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
