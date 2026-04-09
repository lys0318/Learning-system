"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  admin: "/admin",
};

const ROLE_LABEL: Record<string, string> = {
  student: "수강생",
  teacher: "선생님",
  admin: "교육운영자",
};

export async function login(_: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const selectedRole = formData.get("role") as string;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const actualRole = profile?.role ?? "student";

  if (selectedRole && selectedRole !== actualRole) {
    await supabase.auth.signOut();
    return {
      error: `이 계정은 ${ROLE_LABEL[actualRole] ?? actualRole} 계정입니다. 올바른 역할을 선택해주세요.`,
    };
  }

  redirect(ROLE_HOME[actualRole]);
}
