"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createAssignment(courseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const language = formData.get("language") as string;
  const starter_code = formData.get("starter_code") as string;
  const deadline = formData.get("deadline") as string;
  const week_number = parseInt(formData.get("week_number") as string) || 1;

  await supabase.from("assignments").insert({
    course_id: courseId,
    teacher_id: user.id,
    title,
    description,
    language,
    starter_code: starter_code || "",
    deadline: deadline || null,
    week_number,
  });

  redirect(`/teacher/courses/${courseId}/assignments`);
}

export async function deleteAssignment(assignmentId: string, courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("teacher_id", user.id);

  redirect(`/teacher/courses/${courseId}/assignments`);
}
