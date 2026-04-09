import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import MessageThread from "@/components/MessageThread";
import Link from "next/link";

export default async function StudentMessageThreadPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  // 수강 확인 + 강의 정보
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, teacher_id, profiles!teacher_id(full_name)")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const teacher = (course.profiles as unknown) as { full_name: string } | null;

  // 메시지 히스토리
  const admin = createAdminClient();
  const { data: msgs } = await admin
    .from("direct_messages")
    .select("id, sender_id, content, created_at")
    .eq("course_id", courseId)
    .eq("student_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 뒤로가기 */}
      <div className="px-5 py-2 border-b border-gray-700/30 shrink-0">
        <Link href="/student/messages" className="text-xs text-gray-400 hover:text-white transition-colors">
          ← 메시지 목록
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        <MessageThread
          courseId={courseId}
          studentId={user.id}
          currentUserId={user.id}
          courseName={course.title}
          otherName={teacher?.full_name ? `${teacher.full_name} 선생님` : "선생님"}
          initialMessages={(msgs ?? []) as { id: string; sender_id: string; content: string; created_at: string }[]}
        />
      </div>
    </div>
  );
}
