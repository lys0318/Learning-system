import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import WeeklyLearning from "@/components/student/WeeklyLearning";

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  // 수강 여부 확인
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, progress")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, total_weeks, profiles!teacher_id(full_name)")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const teacher = (course.profiles as unknown) as { full_name: string } | null;
  const totalWeeks: number = (course as unknown as { total_weeks: number }).total_weeks ?? 1;

  // admin으로 RLS 우회하여 자료 + 서명 URL 생성
  const admin = createAdminClient();

  const { data: materials } = await admin
    .from("course_materials")
    .select("id, name, file_path, file_type, file_size, week_number, created_at")
    .eq("course_id", courseId)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: true });

  const materialsWithUrls = await Promise.all(
    (materials ?? []).map(async (m) => {
      const { data: urlData } = await admin.storage
        .from("course-materials")
        .createSignedUrl(m.file_path, 3600, { download: m.name });
      return { ...m, downloadUrl: urlData?.signedUrl ?? null };
    })
  );

  // 이 강의의 퀴즈 목록
  const { data: quizzes } = await admin
    .from("quizzes")
    .select("id, title, week_number, difficulty, questions")
    .eq("course_id", courseId)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: true });

  // 이 학생의 학습 완료 목록
  const { data: completions } = await supabase
    .from("material_completions")
    .select("material_id")
    .eq("student_id", user.id)
    .eq("course_id", courseId);

  const completedMaterialIds = (completions ?? []).map((c) => c.material_id as string);

  // 이 학생이 제출한 퀴즈 ID 목록
  const quizIds = (quizzes ?? []).map((q) => q.id);
  const { data: quizResults } = quizIds.length > 0
    ? await supabase
        .from("quiz_results")
        .select("quiz_id")
        .eq("student_id", user.id)
        .in("quiz_id", quizIds)
    : { data: [] };

  const completedQuizIds = [...new Set((quizResults ?? []).map((r) => r.quiz_id as string))];

  // 이 강의의 과제 목록
  const { data: assignments } = await admin
    .from("assignments")
    .select("id, title, language, week_number, deadline")
    .eq("course_id", courseId)
    .order("week_number", { ascending: true })
    .order("created_at", { ascending: true });

  // 이 학생의 과제 제출 현황 (성공한 것만)
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: assignmentSubmissions } = assignmentIds.length > 0
    ? await supabase
        .from("assignment_submissions")
        .select("assignment_id, run_status")
        .eq("student_id", user.id)
        .in("assignment_id", assignmentIds)
    : { data: [] };

  // 과제별 최신 제출 상태 (성공 여부)
  const submittedAssignmentMap = new Map<string, string>();
  for (const s of assignmentSubmissions ?? []) {
    if (!submittedAssignmentMap.has(s.assignment_id)) {
      submittedAssignmentMap.set(s.assignment_id, s.run_status);
    }
  }

  // 자료 + 퀴즈 + 과제 기반 진도율 계산
  const totalItems = materialsWithUrls.length + (quizzes ?? []).length + (assignments ?? []).length;
  const doneItems = completedMaterialIds.length + completedQuizIds.length + submittedAssignmentMap.size;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : enrollment.progress;

  return (
    <main className="max-w-3xl mx-auto px-8 py-8">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/student" className="hover:text-white transition-colors">내 강의</Link>
        <span>/</span>
        <span className="text-white truncate">{course.title}</span>
      </nav>

      {/* 강의 헤더 */}
      <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{course.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {teacher?.full_name ? `${teacher.full_name} 선생님` : "선생님"} · {totalWeeks}주차 수업
            </p>
            {(course as unknown as { description: string | null }).description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-3 leading-relaxed">
                {(course as unknown as { description: string }).description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/student/courses/${courseId}/announcements`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              📢 공지
            </Link>
            <Link
              href={`/student/courses/${courseId}/assignments`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              💻 과제
            </Link>
            <Link
              href={`/student/courses/${courseId}/chat`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-sm font-medium transition-colors"
            >
              🎓 AI 튜터
            </Link>
          </div>
        </div>
      </div>

      {/* 주차별 학습 */}
      <WeeklyLearning
        courseId={courseId}
        totalWeeks={totalWeeks}
        materials={materialsWithUrls.map((m) => ({
          id: m.id,
          name: m.name,
          file_type: m.file_type,
          file_size: m.file_size,
          week_number: m.week_number ?? 1,
          downloadUrl: m.downloadUrl,
        }))}
        quizzes={(quizzes ?? []).map((q) => ({
          id: q.id,
          title: q.title,
          week_number: (q as unknown as { week_number: number }).week_number ?? 1,
          difficulty: (q as unknown as { difficulty: string }).difficulty ?? "normal",
          questionCount: Array.isArray(q.questions) ? (q.questions as unknown[]).length : 0,
        }))}
        assignments={(assignments ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          language: (a as unknown as { language: string }).language,
          week_number: (a as unknown as { week_number: number }).week_number ?? 1,
          deadline: (a as unknown as { deadline: string | null }).deadline ?? null,
          submitted: submittedAssignmentMap.has(a.id),
          submitStatus: submittedAssignmentMap.get(a.id) ?? null,
        }))}
        initialCompletedIds={completedMaterialIds}
        initialCompletedQuizIds={completedQuizIds}
        initialProgress={progress}
      />
    </main>
  );
}
