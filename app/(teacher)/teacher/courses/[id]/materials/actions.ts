"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function saveMaterialMeta(
  courseId: string,
  name: string,
  filePath: string,
  fileType: string,
  fileSize: number
) {
  const { supabase, userId } = await getTeacher();

  const { error } = await supabase.from("course_materials").insert({
    course_id: courseId,
    teacher_id: userId,
    name,
    file_path: filePath,
    file_type: fileType,
    file_size: fileSize,
  });

  if (error) return { error: "자료 저장 중 오류가 발생했습니다." };

  revalidatePath(`/teacher/courses/${courseId}/materials`);
  return { success: true };
}

export async function deleteMaterial(materialId: string, filePath: string) {
  const { supabase, userId } = await getTeacher();

  const { data: material } = await supabase
    .from("course_materials")
    .select("course_id")
    .eq("id", materialId)
    .eq("teacher_id", userId)
    .single();

  if (!material) return { error: "자료를 찾을 수 없습니다." };

  const courseId = material.course_id;

  await supabase
    .from("course_materials")
    .delete()
    .eq("id", materialId)
    .eq("teacher_id", userId);

  await supabase.storage.from("course-materials").remove([filePath]);

  revalidatePath(`/teacher/courses/${courseId}/materials`);
  redirect(`/teacher/courses/${courseId}/materials`);
}
