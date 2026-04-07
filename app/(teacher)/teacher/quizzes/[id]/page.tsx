import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherQuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, questions, courses(title)")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!quiz) notFound();

  const course = (quiz.courses as unknown) as { title: string } | null;
  const questions = (Array.isArray(quiz.questions) ? quiz.questions : []) as {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <header className="border-b border-gray-700/50 px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-gray-400">
          <Link href="/teacher" className="hover:text-white transition-colors">
            강의 관리
          </Link>
          <span>/</span>
          <Link
            href="/teacher/quizzes"
            className="hover:text-white transition-colors"
          >
            퀴즈 관리
          </Link>
          <span>/</span>
          <span className="text-white truncate">{quiz.title}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-8">
        <div className="mb-6">
          <p className="text-blue-400 text-xs mb-1">{course?.title}</p>
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            총 {questions.length}문항 · 정답 포함 미리보기
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="bg-[#16213e] rounded-xl border border-yellow-500/30 p-10 text-center">
            <p className="text-yellow-400 text-sm mb-4">
              이 퀴즈에는 문항 데이터가 없습니다. 삭제 후 다시 생성해주세요.
            </p>
            <Link
              href="/teacher/quizzes"
              className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors"
            >
              퀴즈 목록으로
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-[#16213e] rounded-xl border border-gray-700/50 p-6"
              >
                <p className="text-sm font-medium mb-4">
                  <span className="text-blue-400 mr-1.5">Q{idx + 1}.</span>
                  {q.question}
                </p>

                <ul className="space-y-2 mb-4">
                  {q.options.map((opt) => {
                    const isAnswer = opt === q.answer;
                    return (
                      <li
                        key={opt}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                          isAnswer
                            ? "bg-green-400/15 border border-green-400/40 text-green-300 font-medium"
                            : "text-gray-400 border border-transparent"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center text-xs ${
                            isAnswer
                              ? "border-green-400 bg-green-400 text-black"
                              : "border-gray-600"
                          }`}
                        >
                          {isAnswer ? "✓" : ""}
                        </span>
                        {opt}
                        {isAnswer && (
                          <span className="ml-auto text-xs text-green-400 font-semibold">
                            정답
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="bg-gray-800/60 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-400">
                    <span className="text-yellow-400 font-medium mr-1">해설</span>
                    {q.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/teacher/quizzes"
            className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors"
          >
            ← 목록으로
          </Link>
        </div>
      </main>
    </div>
  );
}
