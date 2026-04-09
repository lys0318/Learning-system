import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AiTutorClient from "@/components/student/AiTutorClient";

export default async function AiTutorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  // 수강 중인 강의 목록
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("progress, status, courses(id, title, profiles(full_name), course_materials(count))")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  // 오늘 보낸 메시지 수
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("role", "user")
    .gte("created_at", today.toISOString());

  const courses = (enrollments ?? []).map((e) => {
    const c = (e.courses as unknown) as {
      id: string;
      title: string;
      profiles: { full_name: string } | null;
      course_materials: { count: number }[];
    } | null;
    return {
      id: c?.id ?? "",
      title: c?.title ?? "",
      teacherName: c?.profiles?.full_name ?? "-",
      materialCount: c?.course_materials?.[0]?.count ?? 0,
      progress: e.progress,
    };
  }).filter((c) => c.id !== "");

  return (
    <div className="flex flex-col h-full min-h-0">
      <AiTutorClient courses={courses} todayCount={todayCount ?? 0} />
    </div>
  );
}
