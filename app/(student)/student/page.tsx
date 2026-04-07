import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/logout/actions";
import ProgressUpdater from "@/components/student/ProgressUpdater";
import DeleteButton from "@/components/DeleteButton";
import { unenrollCourse } from "./actions";

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/login");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, progress, status, enrolled_at, courses(id, title, description, profiles(full_name))")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  const active = enrollments?.filter((e) => e.status !== "completed") ?? [];
  const completed = enrollments?.filter((e) => e.status === "completed") ?? [];

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-700/50 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">AI</div>
            <span className="font-semibold">LearnAI</span>
            <span className="text-gray-500 text-sm">/ 수강생</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/student/quizzes" className="text-sm text-gray-400 hover:text-white transition-colors">
              퀴즈
            </Link>
            <Link href="/student/courses" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              강의 둘러보기
            </Link>
            <span className="text-gray-400 text-sm">{profile?.full_name}</span>
            <form action={logout}>
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        {/* 수강 중 */}
        <section>
          <h2 className="text-lg font-bold mb-4">수강 중 <span className="text-gray-400 font-normal text-sm">({active.length})</span></h2>
          {active.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {active.map((e) => {
                const course = (e.courses as unknown) as { id: string; title: string; description: string | null; profiles: { full_name: string } | null } | null;
                return (
                  <div key={e.id} className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 space-y-4">
                    <div>
                      <h3 className="font-semibold">{course?.title}</h3>
                      <p className="text-gray-400 text-xs mt-0.5">{course?.profiles?.full_name} 선생님</p>
                      {course?.description && (
                        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                    <ProgressUpdater enrollmentId={e.id} initialProgress={e.progress} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-10 text-center">
              <p className="text-gray-400 mb-4">수강 중인 강의가 없습니다.</p>
              <Link href="/student/courses" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors">
                강의 둘러보기
              </Link>
            </div>
          )}
        </section>

        {/* 완강 */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">완강 <span className="text-gray-400 font-normal text-sm">({completed.length})</span></h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {completed.map((e) => {
                const course = (e.courses as unknown) as { title: string; profiles: { full_name: string } | null } | null;
                return (
                  <div key={e.id} className="bg-[#16213e] rounded-xl border border-green-500/20 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{course?.title}</h3>
                        <p className="text-gray-400 text-xs mt-0.5">{course?.profiles?.full_name} 선생님</p>
                      </div>
                      <DeleteButton
                        action={async () => {
                          "use server";
                          await unenrollCourse(e.id);
                        }}
                        confirmMessage={`"${course?.title}" 수강 이력을 삭제하시겠습니까?`}
                        label="삭제"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-green-500 to-green-400" />
                      </div>
                      <span className="text-green-400 text-sm font-medium">100%</span>
                    </div>
                    <p className="text-green-400 text-xs mt-1 font-medium">완강</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
