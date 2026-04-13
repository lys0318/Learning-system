import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const MESSAGE_MAX_LENGTH = 2000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`${user.id}:chat`, 20, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const { courseId, message } = (await req.json()) as {
    courseId: string;
    message: string;
  };

  if (!courseId || !message?.trim()) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (message.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ error: `메시지는 ${MESSAGE_MAX_LENGTH}자 이하로 입력해주세요.` }, { status: 400 });
  }

  // 강의 정보 조회
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description")
    .eq("id", courseId)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // 강의 텍스트 자료 조회 (최대 2개, 퀴즈 소스 가능한 것)
  const { data: materials } = await supabase
    .from("course_materials")
    .select("name, file_path, file_type")
    .eq("course_id", courseId)
    .in("file_type", ["text/plain", "text/markdown"])
    .order("created_at", { ascending: false })
    .limit(2);

  // 텍스트 자료 내용 수집
  let materialContext = "";
  if (materials && materials.length > 0) {
    for (const mat of materials) {
      const { data: blob } = await supabase.storage
        .from("course-materials")
        .download(mat.file_path);
      if (blob) {
        const text = (await blob.text()).slice(0, 3000);
        materialContext += `\n\n[학습 자료: ${mat.name}]\n${text}`;
      }
    }
  }

  // 이전 대화 이력 조회 (최근 20개)
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .order("created_at", { ascending: true })
    .limit(20);

  // 유저 메시지 DB 저장
  await supabase.from("chat_messages").insert({
    student_id: user.id,
    course_id: courseId,
    role: "user",
    content: message.trim(),
  });

  // Claude 메시지 구성
  const systemPrompt = `당신은 "${course.title}" 강의의 AI 튜터입니다.
${course.description ? `강의 소개: ${course.description}` : ""}${materialContext}

학생의 질문에 강의 내용을 바탕으로 친절하고 명확하게 답변하세요.
- 핵심 개념은 예시를 들어 설명하세요.
- 모르는 내용은 솔직하게 말하세요.
- 답변은 한국어로 작성하세요.`;

  const messages: MessageParam[] = [
    ...(history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message.trim() },
  ];

  // 스트리밍 응답
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";

      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        }

        // 어시스턴트 응답 DB 저장
        if (fullText) {
          await supabase.from("chat_messages").insert({
            student_id: user.id,
            course_id: courseId,
            role: "assistant",
            content: fullText,
          });
        }
      } catch (e) {
        console.error("Chat stream error:", e);
        controller.enqueue(
          new TextEncoder().encode("오류가 발생했습니다. 다시 시도해주세요.")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}
