import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuizGenerateForm from "@/components/teacher/QuizGenerateForm";

export default async function NewQuizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, total_weeks")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const courseIds = (courses ?? []).map((c) => c.id);

  const { data: allMaterials } =
    courseIds.length > 0
      ? await supabase
          .from("course_materials")
          .select("id, name, file_type, course_id")
          .eq("teacher_id", user.id)
          .in("course_id", courseIds)
          .in("file_type", [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-powerpoint",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "text/plain",
            "text/markdown",
          ])
          .order("created_at", { ascending: false })
      : { data: [] };

  const coursesMaterials: Record<string, { id: string; name: string; file_type: string }[]> = {};
  (allMaterials ?? []).forEach((m) => {
    if (!coursesMaterials[m.course_id]) coursesMaterials[m.course_id] = [];
    coursesMaterials[m.course_id].push({ id: m.id, name: m.name, file_type: m.file_type });
  });

  return (
    <main className="max-w-2xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">AI 퀴즈 자동 생성</h1>
        <p className="text-gray-400 text-sm mt-1">
          Claude AI가 강의 주제 또는 업로드된 학습 자료를 기반으로 퀴즈를 생성합니다.
        </p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="bg-[#16213e] rounded-2xl border border-gray-700/50 p-6">
          <QuizGenerateForm
          courses={courses.map((c) => ({ id: c.id, title: c.title, total_weeks: (c as unknown as { total_weeks: number }).total_weeks ?? 1 }))}
          coursesMaterials={coursesMaterials}
        />
        </div>
      ) : (
        <div className="bg-[#16213e] rounded-2xl border border-gray-700/50 p-12 text-center">
          <p className="text-gray-400 mb-4">퀴즈를 생성하려면 먼저 강의를 개설해야 합니다.</p>
          <Link
            href="/teacher/courses/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            강의 만들기
          </Link>
        </div>
      )}
    </main>
  );
}
