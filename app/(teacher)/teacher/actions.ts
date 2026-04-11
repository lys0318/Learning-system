"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createCourse(_: unknown, formData: FormData) {
  const { supabase, userId } = await getTeacher();

  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string).trim();
  const status = formData.get("status") as string;
  const category = (formData.get("category") as string).trim();

  if (!title) return { error: "강의명을 입력해주세요." };

  const { error } = await supabase.from("courses").insert({
    teacher_id: userId,
    title,
    description: description || null,
    status,
    category: category || null,
  });

  if (error) return { error: "강의 생성 중 오류가 발생했습니다." };

  redirect("/teacher");
}

// 강의 생성 후 courseId 반환 (파일 업로드와 함께 사용)
export async function createCourseAndReturn(formData: FormData): Promise<{ courseId: string } | { error: string }> {
  const { supabase, userId } = await getTeacher();

  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string).trim();
  const status = formData.get("status") as string;
  const totalWeeks = parseInt(formData.get("total_weeks") as string) || 4;
  const category = (formData.get("category") as string).trim();

  if (!title) return { error: "강의명을 입력해주세요." };

  const { data, error } = await supabase
    .from("courses")
    .insert({ teacher_id: userId, title, description: description || null, status, total_weeks: totalWeeks, category: category || null })
    .select("id")
    .single();

  if (error || !data) return { error: "강의 생성 중 오류가 발생했습니다." };

  return { courseId: data.id };
}

export async function updateCourse(_: unknown, formData: FormData) {
  const { supabase, userId } = await getTeacher();

  const id = formData.get("id") as string;
  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string).trim();
  const status = formData.get("status") as string;
  const category = (formData.get("category") as string).trim();

  if (!title) return { error: "강의명을 입력해주세요." };

  const { error } = await supabase
    .from("courses")
    .update({ title, description: description || null, status, category: category || null })
    .eq("id", id)
    .eq("teacher_id", userId); // RLS 이중 보호

  if (error) return { error: "강의 수정 중 오류가 발생했습니다." };

  redirect("/teacher");
}

export async function deleteCourse(courseId: string) {
  const { supabase, userId } = await getTeacher();

  const { error, count } = await supabase
    .from("courses")
    .delete({ count: "exact" })
    .eq("id", courseId)
    .eq("teacher_id", userId);

  if (error) {
    console.error("deleteCourse error:", error);
    return { error: "강의 삭제 중 오류가 발생했습니다." };
  }
  if (count === 0) {
    console.error("deleteCourse: 0 rows deleted (RLS may be blocking)");
    return { error: "삭제 권한이 없거나 강의를 찾을 수 없습니다." };
  }

  revalidatePath("/teacher");
  redirect("/teacher");
}
