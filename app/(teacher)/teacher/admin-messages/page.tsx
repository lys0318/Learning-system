import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TeacherAdminMessageThread from "@/components/teacher/TeacherAdminMessageThread";

export default async function TeacherAdminMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") redirect("/login");

  const admin = createAdminClient();

  // 읽지 않은 메시지 읽음 처리
  await admin
    .from("admin_teacher_messages")
    .update({ is_read: true })
    .eq("teacher_id", user.id)
    .eq("is_read", false);

  // 메시지 목록 (시간순)
  const { data: messages } = await admin
    .from("admin_teacher_messages")
    .select("id, sender_id, content, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="shrink-0 px-5 py-3 border-b border-gray-200 dark:border-gray-700/30 bg-white dark:bg-[#0d1224] flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-900/60 flex items-center justify-center text-xs font-medium text-purple-300 shrink-0">
            운영
          </div>
          <div>
            <p className="text-sm font-semibold">교육 운영자</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">운영자 메시지 · 답변 가능</p>
          </div>
        </div>
      </div>

      {/* 채팅 스레드 */}
      <div className="flex-1 min-h-0">
        <TeacherAdminMessageThread
          teacherId={user.id}
          teacherUserId={user.id}
          initialMessages={(messages ?? []) as { id: string; sender_id: string; content: string; created_at: string }[]}
        />
      </div>
    </div>
  );
}
