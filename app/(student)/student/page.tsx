import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteButton from "@/components/DeleteButton";
import RatingButton from "@/components/student/RatingButton";
import { unenrollCourse } from "./actions";

const COURSE_COLORS = [
  "from-blue-600/30 to-blue-800/20",
  "from-indigo-600/30 to-indigo-800/20",
  "from-violet-600/30 to-violet-800/20",
  "from-cyan-600/30 to-cyan-800/20",
];
const COURSE_EMOJIS = ["📘", "📗", "📙", "📕", "📓", "📒"];

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
    .select("id, progress, status, enrolled_at, course_id, courses(id, title, description, teacher_id, profiles(id, full_name))")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  const completedCourseIds = (enrollments ?? [])
    .filter((e) => e.status === "completed")
    .map((e) => e.course_id as string);

  const { data: myRatings } = completedCourseIds.length > 0
    ? await supabase
        .from("teacher_ratings")
        .select("course_id, rating, comment")
        .eq("student_id", user.id)
        .in("course_id", completedCourseIds)
    : { data: [] };

  const ratingMap: Record<string, { rating: number; comment: string | null }> = {};
  (myRatings ?? []).forEach((r) => { ratingMap[r.course_id as string] = { rating: r.rating, comment: r.comment }; });

  const { data: quizResults } = await supabase
    .from("quiz_results")
    .select("score")
    .eq("student_id", user.id);

  const { data: chatCount } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("role", "user");

  const active = enrollments ?? [];
  const completed = enrollments?.filter((e) => e.status === "completed") ?? [];

  const avgProgress = active.length > 0
    ? Math.round(active.reduce((s, e) => s + e.progress, 0) / active.length)
    : 0;
  const quizCount = quizResults?.length ?? 0;
  const avgScore = quizCount > 0
    ? Math.round((quizResults ?? []).reduce((s, r) => s + r.score, 0) / quizCount)
    : null;
  const aiCount = (chatCount as unknown as { count: number } | null)?.count ?? 0;

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">수강 중인 강의</p>
          <p className="text-2xl font-bold">{active.length}</p>
          <p className="text-gray-500 text-xs mt-1">완강 {completed.length}개</p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">전체 학습 진도</p>
          <p className="text-2xl font-bold">{avgProgress}%</p>
          <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">완료한 퀴즈</p>
          <p className="text-2xl font-bold">{quizCount}개</p>
          <p className="text-gray-500 text-xs mt-1">
            {avgScore !== null ? `평균 점수 ${avgScore}점` : "아직 응시 전"}
          </p>
        </div>
        <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
          <p className="text-gray-400 text-xs mb-2">AI 튜터 질문</p>
          <p className="text-2xl font-bold">{aiCount}회</p>
          <p className="text-gray-500 text-xs mt-1">누적 질문 수</p>
        </div>
      </div>

      {/* 수강 중 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          수강 중 <span className="text-gray-500 font-normal">({active.length})</span>
        </h2>
        {active.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((e, idx) => {
              const course = (e.courses as unknown) as { id: string; title: string; description: string | null; teacher_id: string; profiles: { id: string; full_name: string } | null } | null;
              const color = COURSE_COLORS[idx % COURSE_COLORS.length];
              const emoji = COURSE_EMOJIS[idx % COURSE_EMOJIS.length];
              const isCompleted = e.status === "completed";
              const myRating = isCompleted ? ratingMap[e.course_id as string] : undefined;
              return (
                <div key={e.id} className={`bg-[#16213e] rounded-xl border overflow-hidden ${isCompleted ? "border-green-500/30" : "border-gray-700/50"}`}>
                  {/* 썸네일 */}
                  <div className={`h-20 bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <span className="text-3xl">{emoji}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/student/courses/${course?.id}`}
                          className="font-semibold text-sm hover:text-blue-400 transition-colors"
                        >
                          {course?.title}
                        </Link>
                        <p className="text-gray-400 text-xs mt-0.5">{course?.profiles?.full_name} 선생님</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCompleted && (
                          <DeleteButton
                            action={async () => {
                              "use server";
                              await unenrollCourse(e.id);
                            }}
                            confirmMessage={`"${course?.title}" 수강 이력을 삭제하시겠습니까?`}
                            label="삭제"
                          />
                        )}
                        <Link
                          href={`/student/courses/${course?.id}/chat`}
                          className="flex items-center px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-xs font-medium transition-colors"
                        >
                          🎓 AI 튜터
                        </Link>
                      </div>
                    </div>
                    {/* 진도 바 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={isCompleted ? "text-green-400 font-medium" : "text-gray-400"}>
                          {isCompleted ? "완강 ✓" : `${e.progress}% 완료`}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-green-500" : ""}`}
                          style={{
                            width: `${e.progress}%`,
                            background: isCompleted ? undefined : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                          }}
                        />
                      </div>
                    </div>
                    {/* 완강 평가 버튼 */}
                    {isCompleted && course?.teacher_id && (
                      <div className="pt-1 border-t border-gray-700/40">
                        <RatingButton
                          courseId={e.course_id as string}
                          teacherId={course.teacher_id}
                          teacherName={course.profiles?.full_name ?? "선생님"}
                          courseTitle={course.title}
                          existingRating={myRating}
                        />
                      </div>
                    )}
                  </div>
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

      {/* AI 추천 배너 */}
      {active.length > 0 && (
        <section>
          <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-xl shrink-0">🤖</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">AI 튜터와 함께 학습하세요</p>
              <p className="text-gray-400 text-xs mt-0.5">강의 내용에 대해 자유롭게 질문하고 맞춤형 설명을 받아보세요</p>
            </div>
            <Link
              href="/student/ai-tutor"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium transition-colors"
            >
              시작하기
            </Link>
          </div>
        </section>
      )}

    </main>
  );
}
