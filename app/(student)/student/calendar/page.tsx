import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarClient, { CalendarEvent } from "@/components/student/CalendarClient";

export default async function StudentCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect("/login");

  // 수강 중인 강의 목록
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, courses(id, title)")
    .eq("student_id", user.id);

  const courseIds = (enrollments ?? []).map((e) => e.course_id as string).filter(Boolean);
  const courseMap: Record<string, string> = {};
  for (const e of enrollments ?? []) {
    const c = (e.courses as unknown) as { id: string; title: string } | null;
    if (c) courseMap[c.id] = c.title;
  }

  const events: CalendarEvent[] = [];

  if (courseIds.length > 0) {
    // 과제 (마감일 기준)
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, title, deadline, language, course_id, created_at")
      .in("course_id", courseIds)
      .order("deadline", { ascending: true });

    for (const a of assignments ?? []) {
      const cid = a.course_id as string;
      const lang = (a as unknown as { language: string }).language;
      events.push({
        id: `assignment-${a.id}`,
        type: "assignment",
        title: a.title,
        courseTitle: courseMap[cid] ?? "강의",
        courseId: cid,
        date: a.created_at,
        deadline: a.deadline ?? undefined,
        href: `/student/courses/${cid}/assignments/${a.id}`,
        extra: lang ? `언어: ${lang.toUpperCase()}` : undefined,
      });
    }

    // 퀴즈 (생성일 기준)
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id, title, difficulty, course_id, created_at")
      .in("course_id", courseIds)
      .order("created_at", { ascending: true });

    for (const q of quizzes ?? []) {
      const cid = q.course_id as string;
      const diffLabel: Record<string, string> = { easy: "쉬움", normal: "보통", hard: "어려움" };
      events.push({
        id: `quiz-${q.id}`,
        type: "quiz",
        title: q.title,
        courseTitle: courseMap[cid] ?? "강의",
        courseId: cid,
        date: q.created_at,
        href: `/student/quizzes/${q.id}`,
        extra: `난이도: ${diffLabel[q.difficulty] ?? q.difficulty}`,
      });
    }

    // 학습 자료 (업로드일 기준)
    const { data: materials } = await supabase
      .from("course_materials")
      .select("id, title, file_type, course_id, created_at")
      .in("course_id", courseIds)
      .order("created_at", { ascending: true });

    for (const m of materials ?? []) {
      const cid = m.course_id as string;
      events.push({
        id: `material-${m.id}`,
        type: "material",
        title: m.title,
        courseTitle: courseMap[cid] ?? "강의",
        courseId: cid,
        date: m.created_at,
        href: `/student/courses/${cid}`,
        extra: m.file_type ? `파일: ${m.file_type.toUpperCase()}` : undefined,
      });
    }
  }

  return (
    <main className="px-6 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">학습 캘린더</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          과제 마감일, 퀴즈, 학습 자료를 한눈에 확인하세요.
        </p>
      </div>

      {courseIds.length === 0 ? (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-16 text-center text-gray-400 dark:text-gray-500">
          수강 중인 강의가 없습니다.
        </div>
      ) : (
        <CalendarClient events={events} />
      )}
    </main>
  );
}
