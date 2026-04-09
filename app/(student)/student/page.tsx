import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProgressUpdater from "@/components/student/ProgressUpdater";
import DeleteButton from "@/components/DeleteButton";
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
    .select("id, progress, status, enrolled_at, courses(id, title, description, profiles(full_name))")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  const { data: quizResults } = await supabase
    .from("quiz_results")
    .select("score")
    .eq("student_id", user.id);

  const { data: chatCount } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("role", "user");

  const active = enrollments?.filter((e) => e.status !== "completed") ?? [];
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
          <p className="text-gray-500 text-xs mt-1">완강 {completed.length}개 포함</p>
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
              const course = (e.courses as unknown) as { id: string; title: string; description: string | null; profiles: { full_name: string } | null } | null;
              const color = COURSE_COLORS[idx % COURSE_COLORS.length];
              const emoji = COURSE_EMOJIS[idx % COURSE_EMOJIS.length];
              return (
                <div key={e.id} className="bg-[#16213e] rounded-xl border border-gray-700/50 overflow-hidden">
                  {/* 썸네일 */}
                  <div className={`h-20 bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <span className="text-3xl">{emoji}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">{course?.title}</h3>
                        <p className="text-gray-400 text-xs mt-0.5">{course?.profiles?.full_name} 선생님</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Link
                          href={`/student/courses/${course?.id}`}
                          className="flex items-center px-2.5 py-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
                        >
                          📂 자료
                        </Link>
                        <Link
                          href={`/student/courses/${course?.id}/chat`}
                          className="flex items-center px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-xs font-medium transition-colors"
                        >
                          🎓 AI 튜터
                        </Link>
                      </div>
                    </div>
                    <ProgressUpdater enrollmentId={e.id} initialProgress={e.progress} />
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

      {/* 완강 */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            완강 <span className="text-gray-500 font-normal">({completed.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {completed.map((e) => {
              const course = (e.courses as unknown) as { title: string; profiles: { full_name: string } | null } | null;
              return (
                <div key={e.id} className="bg-[#16213e] rounded-xl border border-green-500/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm">{course?.title}</h3>
                      <p className="text-gray-400 text-xs mt-0.5">{course?.profiles?.full_name} 선생님</p>
                    </div>
                    <DeleteButton
                      action={async () => {
                        "use server";
                        await unenrollCourse(e.id);
                      }}
                      confirmMessage={`"${course?.title}" 수강 이력을 삭제하시겠습니까?`}
                      label="삭제"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                      <div className="h-full w-full rounded-full bg-green-500" />
                    </div>
                    <span className="text-green-400 text-xs font-medium">완강 ✓</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
