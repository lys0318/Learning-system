import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizPlayer from "@/components/student/QuizPlayer";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/login");

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, questions, course_id, courses(title)")
    .eq("id", id)
    .single();

  if (!quiz) notFound();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", quiz.course_id)
    .eq("status", "active")
    .single();

  if (!enrollment) redirect("/student/quizzes");

  const course = (quiz.courses as unknown) as { title: string } | null;
  const questions = (Array.isArray(quiz.questions) ? quiz.questions : []) as {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];

  return (
    <main className="max-w-2xl mx-auto px-8 py-8">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/student/quizzes" className="hover:text-white transition-colors">퀴즈</Link>
        <span>/</span>
        <span className="text-white truncate">{quiz.title}</span>
      </nav>

      <div className="mb-6">
        <p className="text-blue-400 text-xs mb-1">{course?.title}</p>
        <h1 className="text-xl font-bold">{quiz.title}</h1>
        {questions.length > 0 ? (
          <p className="text-gray-400 text-sm mt-1">총 {questions.length}문항 · 모든 문항에 답한 후 제출하세요</p>
        ) : (
          <p className="text-yellow-400 text-sm mt-1">퀴즈 문항이 없습니다. 교사에게 퀴즈를 다시 생성하도록 요청해주세요.</p>
        )}
      </div>

      {questions.length > 0 ? (
        <QuizPlayer quizId={quiz.id} title={quiz.title} questions={questions} />
      ) : (
        <div className="bg-[#16213e] rounded-xl border border-yellow-500/30 p-10 text-center">
          <p className="text-yellow-400 text-sm mb-4">이 퀴즈에는 문항 데이터가 없습니다.</p>
          <Link
            href="/student/quizzes"
            className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors"
          >
            퀴즈 목록으로
          </Link>
        </div>
      )}
    </main>
  );
}
