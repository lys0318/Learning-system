import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  // 전체 강사 목록
  const { data: teachers } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "teacher")
    .order("full_name");

  const teacherIds = (teachers ?? []).map((t) => t.id);

  // 강사별 마지막 메시지
  const { data: lastMessages } = teacherIds.length > 0
    ? await admin
        .from("admin_teacher_messages")
        .select("teacher_id, content, created_at, sender_id")
        .in("teacher_id", teacherIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // 강사별 마지막 메시지 추출
  const lastMsgMap: Record<string, { content: string; created_at: string; sender_id: string }> = {};
  for (const msg of lastMessages ?? []) {
    if (!lastMsgMap[msg.teacher_id]) {
      lastMsgMap[msg.teacher_id] = { content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id };
    }
  }

  // 대화가 있는 강사 먼저, 그 다음 나머지
  const teachersWithChat = (teachers ?? []).filter((t) => lastMsgMap[t.id]);
  const teachersWithoutChat = (teachers ?? []).filter((t) => !lastMsgMap[t.id]);
  const sortedTeachers = [...teachersWithChat, ...teachersWithoutChat];

  return (
    <main className="px-6 py-6 max-w-2xl">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">강사 메시지</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          강사에게 직접 메시지를 보내거나 대화 내역을 확인하세요
        </p>
      </div>

      {sortedTeachers.length === 0 ? (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center text-gray-400 text-sm">
          등록된 강사가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTeachers.map((t) => {
            const last = lastMsgMap[t.id];
            return (
              <Link
                key={t.id}
                href={`/admin/messages/${t.id}`}
                className="flex items-center gap-4 bg-white dark:bg-[#16213e] hover:bg-gray-50 dark:hover:bg-[#1a2540] rounded-xl border border-gray-200 dark:border-gray-700/50 px-4 py-3.5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-900/60 flex items-center justify-center text-purple-300 text-sm font-bold shrink-0">
                  {(t.full_name ?? "?").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{t.full_name ?? "강사"}</p>
                    {last && (
                      <p className="text-xs text-gray-500 shrink-0">
                        {new Date(last.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                  {last ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {last.sender_id === user.id ? "나: " : ""}{last.content}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">대화 없음 — 메시지를 보내보세요</p>
                  )}
                </div>
                <span className="text-gray-400 shrink-0">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
