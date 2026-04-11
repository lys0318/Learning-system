import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-[#1a1a2e] text-gray-900 dark:text-white">
      <StudentSidebar userName={profile.full_name ?? ""} />
      <div className="flex-1 flex flex-col min-w-0">
        <StudentTopbar />
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
