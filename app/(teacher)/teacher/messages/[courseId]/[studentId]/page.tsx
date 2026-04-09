import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import MessageThread from "@/components/MessageThread";
import Link from "next/link";

export default async function TeacherMessageThreadPage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const { courseId, studentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") redirect("/login");

  // 강의가 본인 것인지 확인
  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .single();
  if (!course) notFound();

  // 학생 정보
  const admin = createAdminClient();
  const { data: studentProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .single();
  if (!studentProfile) notFound();

  // 메시지 히스토리
  const { data: msgs } = await admin
    .from("direct_messages")
    .select("id, sender_id, content, created_at")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 뒤로가기 */}
      <div className="px-5 py-2 border-b border-gray-700/30 shrink-0">
        <Link href="/teacher/messages" className="text-xs text-gray-400 hover:text-white transition-colors">
          ← 메시지 목록
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        <MessageThread
          courseId={courseId}
          studentId={studentId}
          currentUserId={user.id}
          courseName={course.title}
          otherName={studentProfile.full_name ?? "수강생"}
          initialMessages={(msgs ?? []) as { id: string; sender_id: string; content: string; created_at: string }[]}
        />
      </div>
    </div>
  );
}
