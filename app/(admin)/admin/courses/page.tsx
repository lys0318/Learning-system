import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  const { data: courses } = await admin
    .from("courses")
    .select("id, title, status, created_at, enrollments(count), profiles(full_name)")
    .order("created_at", { ascending: false });

  const statusLabel: Record<string, { label: string; color: string }> = {
    published: { label: "공개",   color: "text-green-400 bg-green-400/10 border-green-400/30" },
    draft:     { label: "초안",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
    archived:  { label: "보관",   color: "text-gray-400 bg-gray-400/10 border-gray-400/30" },
  };

  const totalEnroll = (courses ?? []).reduce((sum, c) => {
    const cnt = (c.enrollments as { count: number }[])[0]?.count ?? 0;
    return sum + cnt;
  }, 0);

  return (
    <main className="px-6 py-6 space-y-6">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">전체 강의</p>
          <p className="text-2xl font-bold">{courses?.length ?? 0}개</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">공개 강의</p>
          <p className="text-2xl font-bold">{(courses ?? []).filter((c) => c.status === "published").length}개</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">총 수강 등록</p>
          <p className="text-2xl font-bold">{totalEnroll}건</p>
        </div>
      </div>

      {/* 강의 목록 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold">전체 강의 목록</h2>
        </div>
        {(courses ?? []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/50 text-xs text-gray-400">
                  <th className="text-left px-5 py-3 font-medium">강의명</th>
                  <th className="text-left px-5 py-3 font-medium">교사</th>
                  <th className="text-right px-5 py-3 font-medium">수강생</th>
                  <th className="text-left px-5 py-3 font-medium">등록일</th>
                  <th className="text-left px-5 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {(courses ?? []).map((c) => {
                  const teacher = (c.profiles as unknown) as { full_name: string } | null;
                  const enrollCnt = (c.enrollments as { count: number }[])[0]?.count ?? 0;
                  const s = statusLabel[c.status] ?? statusLabel.draft;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/30 last:border-0 hover:bg-gray-700/10 transition-colors">
                      <td className="px-5 py-3 font-medium max-w-[200px] truncate">{c.title}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{teacher?.full_name ?? "-"}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-600 dark:text-gray-300">{enrollCnt}명</td>
                      <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(c.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">강의가 없습니다.</div>
        )}
      </div>
    </main>
  );
}
