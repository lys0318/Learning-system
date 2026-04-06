import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EnrollButton from "@/components/student/EnrollButton";

export default async function CourseListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/login");

  // 공개 강의 전체 조회
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, profiles(full_name), enrollments(count)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  // 본인이 수강 신청한 course_id 목록
  const { data: myEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id);

  const enrolledIds = new Set(myEnrollments?.map((e) => e.course_id) ?? []);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <header className="border-b border-gray-700/50 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">AI</div>
            <span className="font-semibold">LearnAI</span>
            <span className="text-gray-500 text-sm">/ 강의 목록</span>
          </div>
          <Link href="/student" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← 내 강의로
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">강의 둘러보기</h1>
          <p className="text-gray-400 text-sm mt-0.5">총 {courses?.length ?? 0}개 강의</p>
        </div>

        {courses && courses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((course) => {
              const teacher = (course.profiles as unknown) as { full_name: string } | null;
              const enrollCount = ((course.enrollments as unknown) as { count: number }[])[0]?.count ?? 0;
              const enrolled = enrolledIds.has(course.id);

              return (
                <div
                  key={course.id}
                  className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 flex flex-col gap-3"
                >
                  <div className="flex-1">
                    <h2 className="font-semibold">{course.title}</h2>
                    <p className="text-gray-400 text-xs mt-0.5">{teacher?.full_name} 선생님</p>
                    {course.description && (
                      <p className="text-gray-400 text-sm mt-2 line-clamp-2">{course.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <span className="text-gray-500 text-xs">수강생 {enrollCount}명</span>
                    <EnrollButton courseId={course.id} enrolled={enrolled} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-16 text-center text-gray-400">
            현재 공개된 강의가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
