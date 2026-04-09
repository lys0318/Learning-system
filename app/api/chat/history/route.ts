import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json([]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .order("created_at", { ascending: true })
    .limit(40);

  return NextResponse.json(data ?? []);
}
