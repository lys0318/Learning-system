import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LearningPathClient from "@/components/student/LearningPathClient";

export default async function LearningPathPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  // 수강 중인 강의 + 진도
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("progress, status, course_id")
    .eq("student_id", user.id);

  const courseCount = enrollments?.length ?? 0;
  const completedCount = (enrollments ?? []).filter((e) => e.status === "completed").length;
  const avgProgress = courseCount > 0
    ? Math.round((enrollments ?? []).reduce((s, e) => s + e.progress, 0) / courseCount)
    : 0;

  // 퀴즈 결과
  const { data: quizResults } = await supabase
    .from("quiz_results")
    .select("score")
    .eq("student_id", user.id);

  const quizCount = quizResults?.length ?? 0;
  const avgQuizScore = quizCount > 0
    ? Math.round((quizResults ?? []).reduce((s, r) => s + r.score, 0) / quizCount)
    : null;

  // 과제 현황
  const courseIds = (enrollments ?? []).map((e) => e.course_id as string).filter(Boolean);
  const { data: assignments } = courseIds.length > 0
    ? await supabase.from("assignments").select("id").in("course_id", courseIds)
    : { data: [] };
  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("assignment_id")
    .eq("student_id", user.id);

  const assignmentTotal = assignments?.length ?? 0;
  const submittedIds = new Set((submissions ?? []).map((s) => s.assignment_id));
  const assignmentDone = (assignments ?? []).filter((a) => submittedIds.has(a.id)).length;

  return (
    <main className="px-6 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">AI 학습 경로 추천</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          학습 데이터를 분석하여 나만을 위한 최적의 학습 경로를 추천받으세요.
        </p>
      </div>

      <LearningPathClient
        stats={{
          courseCount,
          completedCount,
          avgProgress,
          avgQuizScore,
          quizCount,
          assignmentTotal,
          assignmentDone,
        }}
      />
    </main>
  );
}
