import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get("teacherId");
  if (!teacherId) return NextResponse.json([], { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 관리자는 모든 강사 대화 조회, 강사는 본인 대화만 조회
  if (profile?.role === "teacher" && user.id !== teacherId) {
    return NextResponse.json([], { status: 403 });
  }
  if (profile?.role !== "admin" && profile?.role !== "teacher") {
    return NextResponse.json([], { status: 403 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_teacher_messages")
    .select("id, sender_id, content, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { teacherId, content } = await req.json() as { teacherId: string; content: string };
  if (!teacherId || !content?.trim()) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = createAdminClient();

  // admin_teacher_messages에 저장
  const { error: msgError } = await admin.from("admin_teacher_messages").insert({
    teacher_id: teacherId,
    sender_id: user.id,
    content: content.trim(),
  });

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

  // 강사에게 알림 전송
  await admin.from("notifications").insert({
    user_id: teacherId,
    type: "admin_message",
    title: "운영자 메시지가 도착했습니다",
    body: content.trim().slice(0, 80),
    link: "/teacher/admin-messages",
  });

  return NextResponse.json({ ok: true });
}
