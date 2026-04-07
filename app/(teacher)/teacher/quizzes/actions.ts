"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import JSZip from "jszip";

async function getTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export type GenerateQuizState = { error?: string; success?: boolean } | null;

/** 파일 MIME 타입으로 Claude에 전달할 콘텐츠 블록을 생성 */
async function buildMaterialContent(
  supabase: Awaited<ReturnType<typeof getTeacher>>["supabase"],
  materialId: string,
  userId: string
): Promise<{
  block: ContentBlockParam | null;
  textContent: string | null;
}> {
  const { data: material } = await supabase
    .from("course_materials")
    .select("file_path, file_type, name")
    .eq("id", materialId)
    .eq("teacher_id", userId)
    .single();

  if (!material) return { block: null, textContent: null };

  const { data: blob, error: dlError } = await supabase.storage
    .from("course-materials")
    .download(material.file_path);

  if (dlError || !blob) return { block: null, textContent: null };

  const mimeType = material.file_type;

  // PDF → Claude document block
  if (mimeType === "application/pdf") {
    const ab = await blob.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    return {
      block: {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: b64 },
      } as ContentBlockParam,
      textContent: null,
    };
  }

  // 이미지 → Claude image block
  const supportedImages = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  type SupportedImage = (typeof supportedImages)[number];
  if ((supportedImages as readonly string[]).includes(mimeType)) {
    const ab = await blob.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    return {
      block: {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as SupportedImage,
          data: b64,
        },
      } as ContentBlockParam,
      textContent: null,
    };
  }

  // 텍스트 파일 → 프롬프트에 직접 포함
  if (mimeType.startsWith("text/")) {
    const text = await blob.text();
    return { block: null, textContent: text };
  }

  // PPTX → 슬라이드 텍스트 추출
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    try {
      const ab = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(ab);
      const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)![0]);
          const numB = parseInt(b.match(/\d+/)![0]);
          return numA - numB;
        });

      const texts: string[] = [];
      for (const slideName of slideFiles) {
        const xml = await zip.files[slideName].async("string");
        const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
        const slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, "").trim())
          .filter(Boolean)
          .join(" ");
        if (slideText) texts.push(`[슬라이드 ${slideFiles.indexOf(slideName) + 1}] ${slideText}`);
      }

      return { block: null, textContent: texts.join("\n") || null };
    } catch {
      return { block: null, textContent: null };
    }
  }

  return { block: null, textContent: null };
}

export async function generateQuiz(
  _: GenerateQuizState,
  formData: FormData
): Promise<GenerateQuizState> {
  const { supabase, userId } = await getTeacher();

  const courseId = formData.get("course_id") as string;
  const topic = (formData.get("topic") as string).trim();
  const materialId = (formData.get("material_id") as string) || null;
  const numQuestions = Math.min(
    10,
    Math.max(3, parseInt(formData.get("num_questions") as string) || 5)
  );

  if (!courseId) return { error: "강의를 선택해주세요." };
  if (!topic) return { error: "퀴즈 주제를 입력해주세요." };

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("teacher_id", userId)
    .single();

  if (!course) return { error: "강의를 찾을 수 없습니다." };

  // 자료 파일 처리
  let materialBlock: ContentBlockParam | null = null;
  let materialTextContent: string | null = null;

  if (materialId) {
    const result = await buildMaterialContent(supabase, materialId, userId);
    materialBlock = result.block;
    materialTextContent = result.textContent;
  }

  // 프롬프트 구성
  const jsonFormat = `
[
  {
    "question": "질문 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answer": "정답 선택지 (options 중 하나와 완전히 동일한 문자열)",
    "explanation": "정답 해설 (2~3문장)"
  }
]`;

  let promptText: string;
  if (materialBlock) {
    // PDF / 이미지: 파일 블록을 함께 전달하며 분석 요청
    promptText = `위의 학습 자료를 분석하여, "${topic}" 주제로 객관식 퀴즈 ${numQuestions}개를 생성해줘. 강의명은 "${course.title}"야.

반드시 아래 JSON 배열 형식으로만 응답해줘. JSON 외 다른 텍스트는 절대 포함하지 마.
${jsonFormat}`;
  } else if (materialTextContent) {
    // 텍스트 파일: 내용을 프롬프트에 포함
    const truncated = materialTextContent.slice(0, 8000);
    promptText = `다음 학습 자료를 바탕으로 강의 "${course.title}"에서 "${topic}" 주제의 객관식 퀴즈 ${numQuestions}개를 생성해줘.

--- 학습 자료 ---
${truncated}
-----------------

반드시 아래 JSON 배열 형식으로만 응답해줘. JSON 외 다른 텍스트는 절대 포함하지 마.
${jsonFormat}`;
  } else {
    // 자료 없음: 주제만으로 생성
    promptText = `강의 "${course.title}"에서 "${topic}" 주제로 객관식 퀴즈 ${numQuestions}개를 생성해줘.

반드시 아래 JSON 배열 형식으로만 응답해줘. JSON 외 다른 텍스트는 절대 포함하지 마.
${jsonFormat}`;
  }

  // Claude API 메시지 콘텐츠 구성
  const userContent: ContentBlockParam[] = materialBlock
    ? [materialBlock, { type: "text", text: promptText }]
    : [{ type: "text", text: promptText }];

  // Claude API 호출
  let questions;
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text");

    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");

    questions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(questions) || questions.length === 0)
      throw new Error("Empty questions");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Claude API error:", msg);
    return { error: `Claude API 오류: ${msg}` };
  }

  const { error } = await supabase.from("quizzes").insert({
    course_id: courseId,
    teacher_id: userId,
    title: topic,
    questions,
  });

  if (error) return { error: "퀴즈 저장 중 오류가 발생했습니다." };

  revalidatePath("/teacher/quizzes");
  redirect("/teacher/quizzes");
}

export async function deleteQuiz(quizId: string) {
  const { supabase, userId } = await getTeacher();

  await supabase
    .from("quizzes")
    .delete()
    .eq("id", quizId)
    .eq("teacher_id", userId);

  revalidatePath("/teacher/quizzes");
  redirect("/teacher/quizzes");
}
