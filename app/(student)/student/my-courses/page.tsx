import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const COURSE_COLORS = [
  "from-blue-600/30 to-blue-800/20",
  "from-indigo-600/30 to-indigo-800/20",
  "from-violet-600/30 to-violet-800/20",
  "from-cyan-600/30 to-cyan-800/20",
  "from-emerald-600/30 to-emerald-800/20",
  "from-amber-600/30 to-amber-800/20",
];
const COURSE_EMOJIS = ["📘", "📗", "📙", "📕", "📓", "📒"];

export default async function MyCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, progress, status, enrolled_at, courses(id, title, profiles!teacher_id(full_name), course_materials(count))")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  return (
    <main className="px-6 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">내 강의</h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">수강 중인 강의 {enrollments?.length ?? 0}개</p>
      </div>

      {enrollments && enrollments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e, idx) => {
            const course = (e.courses as unknown) as {
              id: string;
              title: string;
              profiles: { full_name: string } | null;
              course_materials: { count: number }[];
            } | null;

            const color = COURSE_COLORS[idx % COURSE_COLORS.length];
            const emoji = COURSE_EMOJIS[idx % COURSE_EMOJIS.length];
            const materialCount = course?.course_materials?.[0]?.count ?? 0;
            const completed = e.status === "completed";

            return (
              <div key={e.id} className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden flex flex-col">
                {/* 썸네일 */}
                <div className={`h-32 bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                  <span className="text-4xl">{emoji}</span>
                </div>

                {/* 내용 */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <Link
                      href={`/student/courses/${course?.id}`}
                      className="font-semibold text-sm leading-snug hover:text-blue-400 transition-colors"
                    >
                      {course?.title}
                    </Link>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      {course?.profiles?.full_name ?? "-"} 선생님
                      {materialCount > 0 && (
                        <span className="ml-1.5 text-gray-500">· {materialCount}강</span>
                      )}
                    </p>
                  </div>

                  {/* 진도 바 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={completed ? "text-green-400" : "text-gray-400"}>
                        {completed ? "완강 ✓" : `${e.progress}% 완료`}
                      </span>
                      {materialCount > 0 && (
                        <span className="text-gray-500">
                          {Math.round((e.progress / 100) * materialCount)}/{materialCount}강
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${completed ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${e.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-2 pt-1 border-t border-gray-200 dark:border-gray-700/40 mt-auto">
                    <Link
                      href={`/student/courses/${course?.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 text-gray-300 text-xs font-medium transition-colors"
                    >
                      📚 학습하기
                    </Link>
                    <Link
                      href={`/student/courses/${course?.id}/chat`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-medium transition-colors"
                    >
                      🤖 AI 질문
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center">
          <p className="text-gray-400 mb-4">수강 중인 강의가 없습니다.</p>
          <Link
            href="/student/courses"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            강의 둘러보기
          </Link>
        </div>
      )}
    </main>
  );
}
