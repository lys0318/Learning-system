import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteAccountButton from "@/components/DeleteAccountButton";

export default async function TeacherAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") redirect("/login");

  const initial = (profile.full_name ?? "TC").slice(0, 2);

  return (
    <main className="px-6 py-6 max-w-lg space-y-5">
      <h1 className="text-lg font-semibold">계정 관리</h1>

      {/* 프로필 카드 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-900 flex items-center justify-center text-lg font-bold text-indigo-300 shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-base font-semibold">{profile.full_name ?? "-"}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
            선생님
          </span>
        </div>
      </div>

      {/* 계정 정보 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">계정 정보</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">이름</span>
          <span>{profile.full_name ?? "-"}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700/40" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">이메일</span>
          <span>{user.email}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700/40" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">역할</span>
          <span>선생님</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700/40" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">가입일</span>
          <span>{new Date(user.created_at).toLocaleDateString("ko-KR")}</span>
        </div>
      </div>

      {/* 회원 탈퇴 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5">
        <h2 className="text-sm font-semibold text-red-400 mb-2">주의사항</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">계정을 삭제하면 담당 강의 및 모든 데이터가 영구 삭제됩니다.</p>
        <DeleteAccountButton />
      </div>
    </main>
  );
}
