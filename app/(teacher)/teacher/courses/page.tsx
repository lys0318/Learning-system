import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCourse } from "../actions";
import DeleteButton from "@/components/DeleteButton";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "초안",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  published: { label: "공개",   color: "text-green-400  bg-green-400/10  border-green-400/30"  },
  archived:  { label: "보관",   color: "text-gray-400   bg-gray-400/10   border-gray-400/30"   },
};

export default async function TeacherCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, status, category, created_at, enrollments(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // 카테고리별 그룹화
  const grouped: Record<string, NonNullable<typeof courses>> = {};
  for (const c of courses ?? []) {
    const cat = (c as unknown as { category: string | null }).category ?? "미분류";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  }
  const categoryOrder = Object.keys(grouped).sort((a, b) =>
    a === "미분류" ? 1 : b === "미분류" ? -1 : a.localeCompare(b, "ko")
  );

  const totalEnrollments = (courses ?? []).reduce((sum, c) => {
    return sum + ((c.enrollments as { count: number }[])[0]?.count ?? 0);
  }, 0);

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">강의 관리</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            총 {courses?.length ?? 0}개 강의 · 수강생 {totalEnrollments}명
          </p>
        </div>
        <Link
          href="/teacher/courses/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + 강의 생성
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">전체 강의</p>
          <p className="text-2xl font-bold">{courses?.length ?? 0}개</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">공개 강의</p>
          <p className="text-2xl font-bold text-green-400">
            {courses?.filter((c) => c.status === "published").length ?? 0}개
          </p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">총 수강생</p>
          <p className="text-2xl font-bold">{totalEnrollments}명</p>
        </div>
      </div>

      {/* 강의 목록 */}
      {(courses ?? []).length === 0 ? (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-14 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">아직 개설한 강의가 없습니다.</p>
          <Link
            href="/teacher/courses/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            첫 강의 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map((cat) => (
            <div key={cat}>
              {/* 카테고리 헤더 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{cat}</span>
                <span className="text-xs text-gray-400 dark:text-gray-600">({grouped[cat].length})</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/60" />
              </div>

              {/* 해당 카테고리 강의 카드 */}
              <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 divide-y divide-gray-100 dark:divide-gray-700/40">
                {grouped[cat].map((course) => {
                  const enrollCount = (course.enrollments as { count: number }[])[0]?.count ?? 0;
                  const s = STATUS_LABEL[course.status] ?? STATUS_LABEL.draft;
                  return (
                    <div key={course.id} className="p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{course.title}</h3>
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                            {s.label}
                          </span>
                        </div>
                        {course.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-1">
                            {course.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500">수강생 {enrollCount}명</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/teacher/courses/${course.id}/materials`}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          자료
                        </Link>
                        <Link
                          href={`/teacher/courses/${course.id}/assignments`}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          과제
                        </Link>
                        <Link
                          href={`/teacher/courses/${course.id}/edit`}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 text-xs text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          수정
                        </Link>
                        <DeleteButton
                          action={async () => {
                            "use server";
                            await deleteCourse(course.id);
                          }}
                          confirmMessage="강의를 삭제하시겠습니까?"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
