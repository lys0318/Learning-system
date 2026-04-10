"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function unenrollCourse(enrollmentId: string) {
  const { supabase, userId } = await getStudent();

  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId)
    .eq("student_id", userId)
    .eq("status", "completed");

  if (error) return { error: "수강 취소 중 오류가 발생했습니다." };

  revalidatePath("/student");
  redirect("/student");
}

export async function updateProgress(enrollmentId: string, progress: number) {
  const { supabase, userId } = await getStudent();

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const status = clampedProgress === 100 ? "completed" : "active";

  const { error } = await supabase
    .from("enrollments")
    .update({ progress: clampedProgress, status })
    .eq("id", enrollmentId)
    .eq("student_id", userId);

  if (error) return { error: "진도율 업데이트 중 오류가 발생했습니다." };

  revalidatePath("/student");
  return { success: true };
}

export async function recalcProgress(userId: string, courseId: string) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const { count: totalMaterials } = await admin
    .from("course_materials")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { count: totalQuizzes } = await admin
    .from("quizzes")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { count: doneMaterials } = await supabase
    .from("material_completions")
    .select("*", { count: "exact", head: true })
    .eq("student_id", userId)
    .eq("course_id", courseId);

  // 강의 내 퀴즈 중 이미 제출한 고유 퀴즈 수
  const { data: courseQuizIds } = await admin
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId);

  let doneQuizzes = 0;
  if ((courseQuizIds ?? []).length > 0) {
    const ids = courseQuizIds!.map((q) => q.id);
    const { data: submitted } = await supabase
      .from("quiz_results")
      .select("quiz_id")
      .eq("student_id", userId)
      .in("quiz_id", ids);
    doneQuizzes = new Set((submitted ?? []).map((r) => r.quiz_id)).size;
  }

  const total = (totalMaterials ?? 0) + (totalQuizzes ?? 0);
  const done = (doneMaterials ?? 0) + doneQuizzes;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const status = progress === 100 ? "completed" : "active";

  await supabase
    .from("enrollments")
    .update({ progress, status })
    .eq("student_id", userId)
    .eq("course_id", courseId);

  return progress;
}

export async function completeMaterial(materialId: string, courseId: string) {
  const { supabase, userId } = await getStudent();

  await supabase.from("material_completions").upsert(
    { student_id: userId, material_id: materialId, course_id: courseId },
    { onConflict: "student_id,material_id", ignoreDuplicates: true }
  );

  await recalcProgress(userId, courseId);

  revalidatePath(`/student/courses/${courseId}`);
  revalidatePath("/student");
  revalidatePath("/student/my-courses");
  return { success: true };
}

export async function submitRating({
  courseId,
  teacherId,
  rating,
  comment,
}: {
  courseId: string;
  teacherId: string;
  rating: number;
  comment: string;
}) {
  const { supabase, userId } = await getStudent();

  // 완강 여부 확인
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("status")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .single();

  if (enrollment?.status !== "completed") return { error: "완강한 강의만 평가할 수 있습니다." };

  const { error } = await supabase.from("teacher_ratings").upsert(
    {
      student_id: userId,
      teacher_id: teacherId,
      course_id: courseId,
      rating,
      comment: comment.trim() || null,
    },
    { onConflict: "student_id,course_id" }
  );

  if (error) return { error: "평가 저장 중 오류가 발생했습니다." };

  revalidatePath("/student");
  return { success: true };
}

export async function uncompleteMaterial(materialId: string, courseId: string) {
  const { supabase, userId } = await getStudent();

  await supabase
    .from("material_completions")
    .delete()
    .eq("student_id", userId)
    .eq("material_id", materialId);

  await recalcProgress(userId, courseId);

  revalidatePath(`/student/courses/${courseId}`);
  revalidatePath("/student");
  revalidatePath("/student/my-courses");
  return { success: true };
}
