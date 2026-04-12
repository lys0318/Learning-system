import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import MarketingAdvisorClient from "@/components/admin/MarketingAdvisorClient";

export default async function AdminMarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  const [
    { data: courses },
    { data: enrollments },
    { data: quizResults },
    { data: chatMessages },
    { data: ratings },
  ] = await Promise.all([
    admin
      .from("courses")
      .select("id, title, status")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    admin.from("enrollments").select("course_id, progress, status"),
    admin.from("quiz_results").select("score, quizzes(course_id)"),
    admin.from("chat_messages").select("course_id").eq("role", "user"),
    admin.from("teacher_ratings").select("course_id, rating"),
  ]);

  // 강의별 통계 집계
  const courseList = (courses ?? []).map((c) => {
    const cEnroll = (enrollments ?? []).filter((e) => e.course_id === c.id);
    const cQuiz = (quizResults ?? []).filter(
      (r) => (r.quizzes as unknown as { course_id: string } | null)?.course_id === c.id
    );
    const cChat = (chatMessages ?? []).filter((m) => m.course_id === c.id).length;
    const cRatings = (ratings ?? []).filter((r) => r.course_id === c.id);

    const enrollCount = cEnroll.length;
    const avgProgress = enrollCount > 0
      ? Math.round(cEnroll.reduce((s, e) => s + e.progress, 0) / enrollCount)
      : 0;
    const completedCount = cEnroll.filter((e) => e.status === "completed").length;
    const completionRate = enrollCount > 0 ? Math.round((completedCount / enrollCount) * 100) : 0;
    const avgQuizScore = cQuiz.length > 0
      ? Math.round(cQuiz.reduce((s, r) => s + r.score, 0) / cQuiz.length)
      : null;
    const avgRating = cRatings.length > 0
      ? Math.round((cRatings.reduce((s, r) => s + r.rating, 0) / cRatings.length) * 10) / 10
      : null;

    return {
      id: c.id,
      title: c.title,
      enrollCount,
      avgProgress,
      completionRate,
      avgQuizScore,
      avgRating,
      chatCount: cChat,
    };
  });

  // 플랫폼 전체 통계
  const totalEnroll = (enrollments ?? []).length;
  const totalCompleted = (enrollments ?? []).filter((e) => e.status === "completed").length;
  const overallCompletionRate = totalEnroll > 0 ? Math.round((totalCompleted / totalEnroll) * 100) : 0;
  const allScores = (quizResults ?? []).map((r) => r.score);
  const overallAvgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null;
  const totalChatCount = (chatMessages ?? []).length;

  return (
    <main className="px-6 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">AI 마케팅 조언</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          학습 데이터를 분석하여 강의 홍보 전략과 수강생 유치 방안을 제안받으세요.
        </p>
      </div>

      <MarketingAdvisorClient
        courses={courseList}
        platformStats={{
          totalCourses: courses?.length ?? 0,
          totalEnroll,
          overallCompletionRate,
          overallAvgScore,
          totalChatCount,
        }}
      />
    </main>
  );
}
