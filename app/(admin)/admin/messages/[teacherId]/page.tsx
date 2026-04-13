import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminMessageThread from "@/components/admin/AdminMessageThread";

export default async function AdminMessageThreadPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = await params;
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

  // 강사 정보 확인
  const { data: teacher } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("id", teacherId)
    .eq("role", "teacher")
    .single();
  if (!teacher) notFound();

  // 기존 메시지 로드
  const { data: messages } = await admin
    .from("admin_teacher_messages")
    .select("id, sender_id, content, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="shrink-0 px-5 py-3 border-b border-gray-200 dark:border-gray-700/30 bg-white dark:bg-[#0d1224] flex items-center gap-3">
        <Link
          href="/admin/messages"
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors shrink-0"
        >
          ← 목록
        </Link>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-purple-900/60 flex items-center justify-center text-xs font-medium text-purple-300 shrink-0">
            {(teacher.full_name ?? "?").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{teacher.full_name ?? "강사"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">강사</p>
          </div>
        </div>
      </div>

      {/* 채팅 스레드 */}
      <div className="flex-1 min-h-0">
        <AdminMessageThread
          teacherId={teacherId}
          teacherName={teacher.full_name ?? "강사"}
          adminId={user.id}
          initialMessages={(messages ?? []) as { id: string; sender_id: string; content: string; created_at: string }[]}
        />
      </div>
    </div>
  );
}
