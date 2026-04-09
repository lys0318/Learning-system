import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!courseId || !studentId) return NextResponse.json([]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("direct_messages")
    .select("id, sender_id, content, created_at")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId, studentId, content } = await req.json();
  if (!courseId || !studentId || !content?.trim()) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("direct_messages").insert({
    course_id: courseId,
    student_id: studentId,
    sender_id: user.id,
    content: content.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
