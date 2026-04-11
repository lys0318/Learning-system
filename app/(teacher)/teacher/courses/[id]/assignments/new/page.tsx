import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAssignment } from "../actions";
import DeadlinePicker from "@/components/DeadlinePicker";


export default async function NewAssignmentPage({
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
  if (profile?.role !== "teacher") redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, total_weeks")
    .eq("id", courseId)
    .eq("teacher_id", user.id)
    .single();
  if (!course) notFound();

  const totalWeeks: number = (course as unknown as { total_weeks: number }).total_weeks ?? 4;

  const action = async (formData: FormData) => {
    "use server";
    await createAssignment(courseId, formData);
  };

  return (
    <main className="max-w-2xl mx-auto px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/teacher" className="hover:text-gray-900 dark:hover:text-white transition-colors">강의 관리</Link>
        <span>/</span>
        <Link href={`/teacher/courses/${courseId}/assignments`} className="hover:text-gray-900 dark:hover:text-white transition-colors truncate">{course.title}</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">새 과제</span>
      </nav>

      <h1 className="text-xl font-bold mb-6">코딩 과제 출제</h1>

      <form action={action} className="space-y-5">
        {/* 과제 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            과제 제목 <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="예: 피보나치 수열 구현하기"
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 주차 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            주차 <span className="text-red-500">*</span>
          </label>
          <select
            name="week_number"
            required
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>{w}주차</option>
            ))}
          </select>
        </div>

        {/* 언어 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            프로그래밍 언어 <span className="text-red-500">*</span>
          </label>
          <select
            name="language"
            required
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c">C</option>
          </select>
        </div>

        {/* 문제 지문 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            문제 지문 <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            required
            rows={8}
            placeholder="문제 설명, 입출력 형식, 예시 등을 작성하세요."
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
        </div>

        {/* 초기 코드 템플릿 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            초기 코드 템플릿 <span className="text-gray-400 dark:text-gray-500 font-normal">(선택)</span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">학생이 시작할 기본 코드를 입력하세요. 비워두면 언어별 기본 템플릿이 사용됩니다.</p>
          <textarea
            name="starter_code"
            rows={6}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
        </div>

        {/* 마감일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            마감일 <span className="text-gray-400 dark:text-gray-500 font-normal">(선택)</span>
          </label>
          <DeadlinePicker />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href={`/teacher/courses/${courseId}/assignments`}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 text-sm font-medium text-center hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            과제 출제
          </button>
        </div>
      </form>
    </main>
  );
}
