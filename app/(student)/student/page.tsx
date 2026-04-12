import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteButton from "@/components/DeleteButton";
import RatingButton from "@/components/student/RatingButton";
import { unenrollCourse } from "./actions";

const COURSE_COLORS = [
  "from-blue-600/40 to-indigo-600/40",
  "from-emerald-600/30 to-cyan-600/30",
  "from-amber-500/30 to-orange-600/30",
  "from-violet-600/30 to-pink-600/30",
];
const COURSE_EMOJIS = ["📘", "📗", "📙", "📕", "📓", "📒"];

const STAT_CARDS = [
  { key: "courses",  icon: "📚", color: "blue",   glowColor: "#2563eb" },
  { key: "progress", icon: "📈", color: "indigo",  glowColor: "#6366f1" },
  { key: "quizzes",  icon: "🎯", color: "green",   glowColor: "#10b981" },
  { key: "ai",       icon: "🤖", color: "amber",   glowColor: "#f59e0b" },
];

const ICON_BG: Record<string, string> = {
  blue:   "rgba(37,99,235,.2)",
  indigo: "rgba(99,102,241,.2)",
  green:  "rgba(16,185,129,.2)",
  amber:  "rgba(245,158,11,.2)",
};
const SUB_COLOR: Record<string, string> = {
  blue:   "text-blue-400",
  indigo: "text-indigo-400",
  green:  "text-emerald-400",
  amber:  "text-amber-400",
};

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

  const firstName = (profile?.full_name ?? "").split(" ").pop() ?? profile?.full_name ?? "";

  return (
    <main className="px-5 py-5 space-y-5">
      {/* 웰컴 배너 */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between relative overflow-hidden border border-indigo-500/20"
        style={{ background: "linear-gradient(135deg, rgba(37,99,235,.12) 0%, rgba(99,102,241,.12) 100%)" }}
      >
        <div className="absolute right-16 top-1/2 -translate-y-1/2 text-5xl opacity-10 pointer-events-none select-none">🤖</div>
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">
            안녕하세요, {firstName}님! 👋
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            오늘도 학습 목표를 달성해보세요. 현재 {active.length}개 강의 수강 중입니다.
          </p>
        </div>
        <Link
          href="/student/courses"
          className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 4px 15px rgba(37,99,235,.35)" }}
        >
          강의 둘러보기 →
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 수강 중 */}
        <div
          className="rounded-2xl border border-white/[0.07] p-4 relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{ background: "#0d1b35" }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-50 -translate-y-8 translate-x-8 pointer-events-none" style={{ background: STAT_CARDS[0].glowColor, filter: "blur(30px)" }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3" style={{ background: ICON_BG.blue }}>
            📚
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{active.length}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 mb-2">수강 중인 강의</p>
          <p className={`text-[11px] ${SUB_COLOR.blue}`}>완강 {completed.length}개</p>
        </div>

        {/* 학습 진도 */}
        <div
          className="rounded-2xl border border-white/[0.07] p-4 relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{ background: "#0d1b35" }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-50 -translate-y-8 translate-x-8 pointer-events-none" style={{ background: STAT_CARDS[1].glowColor, filter: "blur(30px)" }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3" style={{ background: ICON_BG.indigo }}>
            📈
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{avgProgress}%</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 mb-2">전체 학습 진도</p>
          <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>

        {/* 퀴즈 */}
        <div
          className="rounded-2xl border border-white/[0.07] p-4 relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{ background: "#0d1b35" }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-50 -translate-y-8 translate-x-8 pointer-events-none" style={{ background: STAT_CARDS[2].glowColor, filter: "blur(30px)" }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3" style={{ background: ICON_BG.green }}>
            🎯
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{quizCount}개</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 mb-2">완료한 퀴즈</p>
          <p className={`text-[11px] ${SUB_COLOR.green}`}>
            {avgScore !== null ? `평균 점수 ${avgScore}점` : "아직 응시 전"}
          </p>
        </div>

        {/* AI 튜터 */}
        <div
          className="rounded-2xl border border-white/[0.07] p-4 relative overflow-hidden transition-all hover:-translate-y-0.5"
          style={{ background: "#0d1b35" }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-50 -translate-y-8 translate-x-8 pointer-events-none" style={{ background: STAT_CARDS[3].glowColor, filter: "blur(30px)" }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3" style={{ background: ICON_BG.amber }}>
            🤖
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{aiCount}회</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 mb-2">AI 튜터 질문</p>
          <p className={`text-[11px] ${SUB_COLOR.amber}`}>누적 질문 수</p>
        </div>
      </div>

      {/* 수강 중 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            수강 중 <span className="text-gray-400 dark:text-gray-600 font-normal text-xs">({active.length})</span>
          </h2>
          <Link href="/student/my-courses" className="text-xs text-blue-400 hover:text-blue-300">전체 보기 →</Link>
        </div>
        {active.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((e, idx) => {
              const course = (e.courses as unknown) as { id: string; title: string; description: string | null; teacher_id: string; profiles: { id: string; full_name: string } | null } | null;
              const color = COURSE_COLORS[idx % COURSE_COLORS.length];
              const emoji = COURSE_EMOJIS[idx % COURSE_EMOJIS.length];
              const isCompleted = e.status === "completed";
              const myRating = isCompleted ? ratingMap[e.course_id as string] : undefined;
              return (
                <div
                  key={e.id}
                  className={`rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    isCompleted
                      ? "border-green-500/25 dark:border-green-500/25"
                      : "border-gray-200 dark:border-white/[0.07]"
                  }`}
                  style={{ background: "#0d1b35" }}
                >
                  {/* 썸네일 */}
                  <div className={`h-20 bg-gradient-to-br ${color} flex items-center justify-center relative`}>
                    <span className="text-3xl">{emoji}</span>
                    {isCompleted && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-400">
                        완강 ✓
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/student/courses/${course?.id}`}
                          className="font-bold text-sm text-gray-900 dark:text-white hover:text-blue-400 transition-colors"
                        >
                          {course?.title}
                        </Link>
                        <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">{course?.profiles?.full_name} 선생님</p>
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
                          className="flex items-center px-2.5 py-1.5 rounded-xl border border-blue-500/30 text-blue-400 text-xs font-semibold transition-all hover:bg-blue-600/30"
                          style={{ background: "rgba(37,99,235,.15)" }}
                        >
                          🤖 AI 튜터
                        </Link>
                      </div>
                    </div>
                    {/* 진도 바 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className={isCompleted ? "text-emerald-400 font-semibold" : "text-gray-400 dark:text-gray-500"}>
                          {isCompleted ? "완강 ✓" : `${e.progress}% 완료`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : ""}`}
                          style={{
                            width: `${e.progress}%`,
                            background: isCompleted ? undefined : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                          }}
                        />
                      </div>
                    </div>
                    {/* 완강 평가 */}
                    {isCompleted && course?.teacher_id && (
                      <div className="pt-2 border-t border-gray-200 dark:border-white/[0.07]">
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
          <div
            className="rounded-2xl border border-white/[0.07] p-10 text-center"
            style={{ background: "#0d1b35" }}
          >
            <p className="text-gray-500 dark:text-gray-500 mb-4 text-sm">수강 중인 강의가 없습니다.</p>
            <Link
              href="/student/courses"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-500"
            >
              강의 둘러보기
            </Link>
          </div>
        )}
      </section>

      {/* AI 추천 배너 */}
      {active.length > 0 && (
        <section>
          <div
            className="rounded-2xl border border-indigo-500/20 p-4 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,.1), rgba(99,102,241,.1))" }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(37,99,235,.3), rgba(99,102,241,.3))" }}
            >
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">AI 튜터와 함께 학습하세요</p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">강의 내용에 대해 자유롭게 질문하고 맞춤형 설명을 받아보세요</p>
            </div>
            <Link
              href="/student/ai-tutor"
              className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 4px 12px rgba(37,99,235,.3)" }}
            >
              시작하기 →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
