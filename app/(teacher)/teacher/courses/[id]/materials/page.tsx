import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WeeklyMaterials from "@/components/teacher/WeeklyMaterials";
import { deleteMaterial } from "./actions";

export default async function CourseMaterialsPage({
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
  if (profile?.role !== "teacher") redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, total_weeks")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .single();
  if (!course) notFound();

  const totalWeeks: number = (course as unknown as { total_weeks: number }).total_weeks ?? 4;

  const { data: materials } = await supabase
    .from("course_materials")
    .select("id, name, file_path, file_type, file_size, week_number, created_at")
    .eq("course_id", courseId)
    .eq("teacher_id", user.id)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: true });

  const deleteAction = async (materialId: string, filePath: string) => {
    "use server";
    await deleteMaterial(materialId, filePath);
  };

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/teacher" className="hover:text-white transition-colors">강의 관리</Link>
        <span>/</span>
        <span className="text-white truncate">{course.title}</span>
        <span>/</span>
        <span className="text-white">학습 자료</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">학습 자료 관리</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {course.title} · {totalWeeks}주차 수업 · 총 {materials?.length ?? 0}개 파일
          </p>
        </div>
        <Link
          href={`/teacher/courses/${courseId}/assignments`}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
        >
          💻 코딩 과제
        </Link>
      </div>

      <WeeklyMaterials
        courseId={courseId}
        totalWeeks={totalWeeks}
        materials={(materials ?? []) as {
          id: string;
          name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          week_number: number;
          created_at: string;
        }[]}
        deleteAction={deleteAction}
      />
    </main>
  );
}
