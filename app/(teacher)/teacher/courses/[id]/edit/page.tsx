import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CourseForm from "@/components/teacher/CourseForm";
import { updateCourse } from "../../../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, status")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!course) notFound();

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <header className="border-b border-gray-700/50 px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2 text-sm text-gray-400">
          <Link href="/teacher" className="hover:text-white transition-colors">내 강의</Link>
          <span>/</span>
          <span className="text-white">강의 수정</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="text-xl font-bold mb-6">강의 수정</h1>
        <div className="bg-[#16213e] rounded-2xl border border-gray-700/50 p-6">
          <CourseForm action={updateCourse} course={course} />
        </div>
      </main>
    </div>
  );
}
