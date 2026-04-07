import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/logout/actions";
import { deleteCourse } from "./actions";
import DeleteButton from "@/components/DeleteButton";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "초안",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  published: { label: "공개",   color: "text-green-400  bg-green-400/10  border-green-400/30"  },
  archived:  { label: "보관",   color: "text-gray-400   bg-gray-400/10   border-gray-400/30"   },
};

export default async function TeacherPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, status, created_at, enrollments(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-700/50 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">AI</div>
            <span className="font-semibold">LearnAI</span>
            <span className="text-gray-500 text-sm">/ 교사</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{profile?.full_name}</span>
            <form action={logout}>
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8">
        {/* 상단 타이틀 + 강의 생성 버튼 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">내 강의 관리</h1>
            <p className="text-gray-400 text-sm mt-0.5">총 {courses?.length ?? 0}개 강의</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/teacher/quizzes"
              className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors"
            >
              퀴즈 관리
            </Link>
            <Link
              href="/teacher/courses/new"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              + 강의 생성
            </Link>
          </div>
        </div>

        {/* 강의 목록 */}
        {courses && courses.length > 0 ? (
          <div className="space-y-3">
            {courses.map((course) => {
              const enrollCount = (course.enrollments as { count: number }[])[0]?.count ?? 0;
              const s = STATUS_LABEL[course.status] ?? STATUS_LABEL.draft;
              return (
                <div
                  key={course.id}
                  className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold truncate">{course.title}</h2>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-1">
                      {course.description ?? "설명 없음"}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">수강생 {enrollCount}명</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/teacher/courses/${course.id}/materials`}
                      className="px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors"
                    >
                      자료
                    </Link>
                    <Link
                      href={`/teacher/courses/${course.id}/edit`}
                      className="px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors"
                    >
                      수정
                    </Link>
                    <DeleteButton
                      action={async () => {
                        "use server";
                        await deleteCourse(course.id);
                      }}
                      confirmMessage="강의를 삭제하시겠습니까?"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-16 text-center">
            <p className="text-gray-400 mb-4">아직 개설한 강의가 없습니다.</p>
            <Link
              href="/teacher/courses/new"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              첫 강의 만들기
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
