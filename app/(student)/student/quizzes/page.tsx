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
    .eq("student_id", user.id)
    .eq("status", "active");

  const courseIds = (enrollments ?? []).map((e) => e.course_id);

  const { data: quizzes } =
    courseIds.length > 0
      ? await supabase
          .from("quizzes")
          .select("id, title, questions, created_at, courses(title)")
          .in("course_id", courseIds)
          .order("created_at", { ascending: false })
      : { data: [] };

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

  return (
    <main className="px-8 py-8 space-y-8">
      {/* 통계 */}
      {totalResults.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 text-center">
            <p className="text-gray-400 text-xs mb-1">총 응시 횟수</p>
            <p className="text-2xl font-bold">{totalResults.length}</p>
          </div>
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 text-center">
            <p className="text-gray-400 text-xs mb-1">평균 점수</p>
            <p className={`text-2xl font-bold ${avgScore !== null && avgScore >= 70 ? "text-green-400" : "text-yellow-400"}`}>
              {avgScore}점
            </p>
          </div>
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 text-center">
            <p className="text-gray-400 text-xs mb-1">응시한 퀴즈 수</p>
            <p className="text-2xl font-bold">{Object.keys(scoreMap).length}</p>
          </div>
        </section>
      )}

      {/* 퀴즈 목록 */}
      <section>
        <h1 className="text-lg font-bold mb-4">
          수강 중인 강의 퀴즈{" "}
          <span className="text-gray-400 font-normal text-sm">({quizzes?.length ?? 0})</span>
        </h1>

        {quizzes && quizzes.length > 0 ? (
          <div className="space-y-3">
            {quizzes.map((quiz) => {
              const course = (quiz.courses as unknown) as { title: string } | null;
              const result = scoreMap[quiz.id];
              const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

              return (
                <div
                  key={quiz.id}
                  className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">{quiz.title}</h2>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {course?.title} · {questionCount}문항
                    </p>
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
        ) : (
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-16 text-center">
            <p className="text-gray-400 mb-4">
              {courseIds.length === 0 ? "수강 중인 강의가 없습니다." : "아직 생성된 퀴즈가 없습니다."}
            </p>
            {courseIds.length === 0 && (
              <Link href="/student/courses" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors">
                강의 둘러보기
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
