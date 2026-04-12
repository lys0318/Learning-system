"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createAnnouncement(courseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  if (!title?.trim() || !content?.trim()) {
    redirect(`/teacher/courses/${courseId}/announcements`);
  }

  await supabase.from("announcements").insert({
    course_id: courseId,
    teacher_id: user.id,
    title: title.trim(),
    content: content.trim(),
  });

  redirect(`/teacher/courses/${courseId}/announcements`);
}

export async function deleteAnnouncement(announcementId: string, courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("teacher_id", user.id);

  redirect(`/teacher/courses/${courseId}/announcements`);
}
