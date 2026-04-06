"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function enrollCourse(courseId: string) {
  const { supabase, userId } = await getStudent();

  const { error } = await supabase.from("enrollments").insert({
    student_id: userId,
    course_id: courseId,
    status: "active",
    progress: 0,
  });

  if (error) {
    if (error.code === "23505") return { error: "이미 수강 신청한 강의입니다." };
    return { error: "수강 신청 중 오류가 발생했습니다." };
  }

  revalidatePath("/student/courses");
  revalidatePath("/student");
  return { success: true };
}

export async function updateProgress(enrollmentId: string, progress: number) {
  const { supabase, userId } = await getStudent();

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const status = clampedProgress === 100 ? "completed" : "active";

  const { error } = await supabase
    .from("enrollments")
    .update({ progress: clampedProgress, status })
    .eq("id", enrollmentId)
    .eq("student_id", userId); // RLS 이중 보호

  if (error) return { error: "진도율 업데이트 중 오류가 발생했습니다." };

  revalidatePath("/student");
  return { success: true };
}
