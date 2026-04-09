import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatWindow from "@/components/student/ChatWindow";

export default async function CourseChatPage({
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

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .order("created_at", { ascending: true })
    .limit(40);

  const initialMessages = (history ?? []) as {
    role: "user" | "assistant";
    content: string;
  }[];

  return (
    <div className="flex flex-col h-full">
      {/* 채팅 헤더 */}
      <div className="border-b border-gray-700/50 px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/student" className="hover:text-white transition-colors">내 강의</Link>
          <span>/</span>
          <span className="text-white truncate">{course.title}</span>
          <span>/</span>
          <span className="text-white">AI 튜터</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChatWindow
          courseId={courseId}
          courseTitle={course.title}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
