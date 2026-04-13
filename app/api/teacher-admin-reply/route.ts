import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { content } = await req.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = createAdminClient();

  // 메시지 저장 (teacher_id = 본인, sender_id = 본인)
  const { error: msgError } = await admin.from("admin_teacher_messages").insert({
    teacher_id: user.id,
    sender_id: user.id,
    content: content.trim(),
  });
  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

  // 관리자(admin role) 전원에게 알림 전송
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if ((admins ?? []).length > 0) {
    await admin.from("notifications").insert(
      (admins ?? []).map((a) => ({
        user_id: a.id,
        type: "admin_message",
        title: `${profile.full_name ?? "강사"}님의 답변이 도착했습니다`,
        body: content.trim().slice(0, 80),
        link: `/admin/messages/${user.id}`,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
