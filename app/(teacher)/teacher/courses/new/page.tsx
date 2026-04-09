import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CourseCreateForm from "@/components/teacher/CourseCreateForm";

export default async function NewCoursePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  return (
    <main className="max-w-2xl mx-auto px-8 py-8">
      <h1 className="text-xl font-bold mb-6">새 강의 만들기</h1>
      <div className="bg-[#16213e] rounded-2xl border border-gray-700/50 p-6">
        <CourseCreateForm />
      </div>
    </main>
  );
}
