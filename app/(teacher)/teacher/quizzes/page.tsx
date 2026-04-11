import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteQuiz } from "./actions";
import DeleteButton from "@/components/DeleteButton";

export default async function TeacherQuizzesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, week_number, difficulty, created_at, questions, courses(title), quiz_results(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">퀴즈 관리</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">총 {quizzes?.length ?? 0}개 퀴즈</p>
        </div>
        <Link
          href="/teacher/quizzes/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + AI 퀴즈 생성
        </Link>
      </div>

      {quizzes && quizzes.length > 0 ? (
        <div className="space-y-3">
          {quizzes.map((quiz) => {
            const course = (quiz.courses as unknown) as { title: string } | null;
            const resultCount = (quiz.quiz_results as { count: number }[])[0]?.count ?? 0;
            const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
            const weekNum = (quiz as unknown as { week_number: number }).week_number ?? 1;
            const difficulty = (quiz as unknown as { difficulty: string }).difficulty ?? "normal";
            const difficultyStyle = {
              easy:   { label: "쉬움",   cls: "border-green-400/30 text-green-400 bg-green-400/10" },
              normal: { label: "보통",   cls: "border-blue-400/30 text-blue-400 bg-blue-400/10" },
              hard:   { label: "어려움", cls: "border-red-400/30 text-red-400 bg-red-400/10" },
            }[difficulty] ?? { label: "보통", cls: "border-blue-400/30 text-blue-400 bg-blue-400/10" };

            return (
              <div
                key={quiz.id}
                className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-semibold truncate">{quiz.title}</h2>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-indigo-400/30 text-indigo-400 bg-indigo-400/10">
                      {weekNum}주차
                    </span>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${difficultyStyle.cls}`}>
                      {difficultyStyle.label}
                    </span>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-gray-600/50 text-gray-400 bg-gray-400/10">
                      {questionCount}문항
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{course?.title ?? "강의 없음"}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">제출 {resultCount}회</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/teacher/quizzes/${quiz.id}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors"
                  >
                    확인
                  </Link>
                  <DeleteButton
                    action={async () => {
                      "use server";
                      await deleteQuiz(quiz.id);
                    }}
                    confirmMessage="퀴즈를 삭제하시겠습니까?"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">아직 생성한 퀴즈가 없습니다.</p>
          <Link
            href="/teacher/quizzes/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            첫 퀴즈 만들기
          </Link>
        </div>
      )}
    </main>
  );
}
