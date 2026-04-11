import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StudentQuizzesPage() {
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
    .select("course_id")
    .eq("student_id", user.id);

  const courseIds = (enrollments ?? []).map((e) => e.course_id);

  type QuizRow = {
    id: string; title: string; questions: unknown; week_number: number;
    difficulty: string; created_at: string; course_id: string;
    courses: { id: string; title: string }[] | null;
  };
  const { data: quizzes } = courseIds.length > 0
    ? (await supabase
        .from("quizzes")
        .select("id, title, questions, week_number, difficulty, created_at, course_id, courses(id, title)")
        .in("course_id", courseIds)
        .order("week_number", { ascending: true })
        .order("created_at", { ascending: true })) as { data: QuizRow[] | null }
    : { data: [] as QuizRow[] };

  const { data: myResults } = await supabase
    .from("quiz_results")
    .select("quiz_id, score, submitted_at")
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false });

  const scoreMap: Record<string, { score: number; submitted_at: string }> = {};
  (myResults ?? []).forEach((r) => {
    if (!scoreMap[r.quiz_id]) {
      scoreMap[r.quiz_id] = { score: r.score, submitted_at: r.submitted_at };
    }
  });

  const totalResults = myResults ?? [];
  const avgScore =
    totalResults.length > 0
      ? Math.round(totalResults.reduce((sum, r) => sum + r.score, 0) / totalResults.length)
      : null;

  // 강의별로 퀴즈 그룹핑
  const courseMap: Record<string, { title: string; quizzes: QuizRow[] }> = {};
  (quizzes ?? []).forEach((quiz) => {
    const course = (quiz.courses as unknown) as { id: string; title: string } | null;
    const courseId = quiz.course_id as string;
    if (!courseMap[courseId]) {
      courseMap[courseId] = { title: course?.title ?? "강의", quizzes: [] };
    }
    courseMap[courseId].quizzes.push(quiz);
  });

  const groupedCourses = Object.entries(courseMap);

  return (
    <main className="px-8 py-8 space-y-8">
      {/* 통계 */}
      {totalResults.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">총 응시 횟수</p>
            <p className="text-2xl font-bold">{totalResults.length}</p>
          </div>
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">평균 점수</p>
            <p className={`text-2xl font-bold ${avgScore !== null && avgScore >= 70 ? "text-green-400" : "text-yellow-400"}`}>
              {avgScore}점
            </p>
          </div>
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">응시한 퀴즈 수</p>
            <p className="text-2xl font-bold">{Object.keys(scoreMap).length}</p>
          </div>
        </section>
      )}

      {/* 강의별 퀴즈 목록 */}
      {groupedCourses.length > 0 ? (
        <div className="space-y-10">
          {groupedCourses.map(([courseId, { title, quizzes: courseQuizzes }]) => (
            <section key={courseId}>
              {/* 강의명 헤더 */}
              <div className="mb-4 pb-3 border-b border-gray-700/60">
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">퀴즈 {courseQuizzes?.length ?? 0}개</p>
              </div>

              <div className="space-y-3">
                {(courseQuizzes ?? []).map((quiz) => {
                  const result = scoreMap[quiz.id];
                  const questionCount = Array.isArray(quiz.questions) ? (quiz.questions as unknown[]).length : 0;
                  const weekNum = quiz.week_number ?? 1;
                  const difficultyStyle: Record<string, { label: string; cls: string }> = {
                    easy:   { label: "쉬움",   cls: "bg-green-500/15 border-green-500/25 text-green-400" },
                    normal: { label: "보통",   cls: "bg-blue-500/15 border-blue-500/25 text-blue-400" },
                    hard:   { label: "어려움", cls: "bg-red-500/15 border-red-500/25 text-red-400" },
                  };
                  const diff = difficultyStyle[quiz.difficulty] ?? difficultyStyle.normal;

                  return (
                    <div
                      key={quiz.id}
                      className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{quiz.title}</h3>
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium">
                            {weekNum}주차
                          </span>
                          <span className={`shrink-0 px-2 py-0.5 rounded-md border text-xs font-medium ${diff.cls}`}>
                            {diff.label}
                          </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{questionCount}문항</p>
                        {result && (
                          <p className={`text-xs mt-1 font-medium ${result.score >= 70 ? "text-green-400" : "text-yellow-400"}`}>
                            최근 점수: {result.score}점
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/student/quizzes/${quiz.id}`}
                        className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
                      >
                        {result ? "다시 풀기" : "퀴즈 풀기"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {courseIds.length === 0 ? "수강 중인 강의가 없습니다." : "아직 생성된 퀴즈가 없습니다."}
          </p>
          {courseIds.length === 0 && (
            <Link href="/student/courses" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors">
              강의 둘러보기
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
