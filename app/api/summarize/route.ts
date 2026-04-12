import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropic } from "@/lib/anthropic";
import JSZip from "jszip";
import type { MessageParam, ImageBlockParam, Base64PDFSource } from "@anthropic-ai/sdk/resources/messages";

// 지원되는 파일 타입 확인
function getSupportedType(mimeType: string): "pdf" | "text" | "image" | "pptx" | null {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/")) return "text";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
  return null;
}

// PPTX에서 텍스트 추출 (ppt/slides/slide*.xml의 <a:t> 태그)
async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const numB = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return numA - numB;
    });

  const texts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
    const slideText = matches
      .map((m) => m.replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.length > 0)
      .join(" ");
    if (slideText.trim()) {
      texts.push(`[슬라이드 ${i + 1}] ${slideText}`);
    }
  }
  return texts.join("\n");
}

function getImageMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/gif") return "image/gif";
  if (mimeType === "image/webp") return "image/webp";
  return "image/jpeg";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { materialId, courseId } = await req.json();
  if (!materialId || !courseId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // 수강 여부 확인
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 자료 정보 조회
  const admin = createAdminClient();
  const { data: material } = await admin
    .from("course_materials")
    .select("id, name, file_path, file_type, course_id")
    .eq("id", materialId)
    .eq("course_id", courseId)
    .single();

  if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  const supportedType = getSupportedType(material.file_type);
  if (!supportedType) {
    return NextResponse.json(
      { error: "이 파일 형식은 AI 요약을 지원하지 않습니다. (PDF, PPT, 텍스트, 이미지 파일만 지원)" },
      { status: 422 }
    );
  }

  // Supabase Storage에서 파일 다운로드
  const { data: blob, error: downloadError } = await admin.storage
    .from("course-materials")
    .download(material.file_path);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "파일을 불러올 수 없습니다." }, { status: 500 });
  }

  // Claude 메시지 구성
  let userContent: MessageParam["content"];

  if (supportedType === "pptx") {
    const arrayBuffer = await blob.arrayBuffer();
    const extracted = await extractPptxText(arrayBuffer);
    if (!extracted.trim()) {
      return NextResponse.json({ error: "슬라이드에서 텍스트를 추출할 수 없습니다." }, { status: 422 });
    }
    userContent = `다음은 PPT 강의 자료(${material.name})에서 추출한 슬라이드 텍스트입니다. 내용을 요약해주세요:\n\n${extracted.slice(0, 20000)}`;
  } else if (supportedType === "text") {
    const text = await blob.text();
    userContent = `다음 강의 자료를 요약해주세요:\n\n파일명: ${material.name}\n\n${text.slice(0, 20000)}`;
  } else if (supportedType === "pdf") {
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    userContent = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        } as Base64PDFSource,
      },
      {
        type: "text",
        text: `위 PDF 강의 자료(${material.name})를 요약해주세요.`,
      },
    ];
  } else {
    // image
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    userContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: getImageMediaType(material.file_type),
          data: base64,
        },
      } as ImageBlockParam,
      {
        type: "text",
        text: `위 강의 자료 이미지(${material.name})를 설명하고 핵심 내용을 요약해주세요.`,
      },
    ];
  }

  const systemPrompt = `당신은 학습 자료를 분석하고 요약하는 AI 교육 어시스턴트입니다.
강의 자료를 분석하여 학생이 이해하기 쉽도록 핵심 내용을 요약해주세요.

요약 형식:
1. **핵심 주제**: 자료의 주요 주제를 1~2문장으로
2. **주요 내용**: 핵심 개념과 내용을 3~5개 항목으로 정리
3. **학습 포인트**: 꼭 기억해야 할 핵심 포인트 2~3가지
4. **한 줄 요약**: 전체 내용을 한 문장으로

답변은 한국어로 작성하세요.`;

  // 스트리밍 응답
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
      } catch (e) {
        console.error("Summarize error:", e);
        controller.enqueue(
          new TextEncoder().encode("요약 중 오류가 발생했습니다. 다시 시도해주세요.")
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
