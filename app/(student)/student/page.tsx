import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/logout/actions";
import { redirect } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">수강생 대시보드</h1>
            <p className="text-gray-400 mt-1">안녕하세요, {profile?.full_name}님</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
        <div className="bg-[#16213e] rounded-2xl p-8 border border-gray-700/50 text-center text-gray-400">
          수강생 기능을 준비 중입니다.
        </div>
      </div>
    </div>
  );
}
