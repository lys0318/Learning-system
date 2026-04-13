import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropic } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { courseId, context } = await req.json() as { courseId?: string; context?: string };

  const admin = createAdminClient();

  // 강의별 상세 데이터 수집
  const { data: courses } = await admin
    .from("courses")
    .select("id, title, description, status, created_at, profiles!teacher_id(full_name)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  // 수강 데이터
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("student_id, course_id, progress, status");

  // 퀴즈 결과
  const { data: quizResults } = await admin
    .from("quiz_results")
    .select("score, quizzes(course_id)");

  // AI 튜터 질문 수 (강의별)
  const { data: chatMessages } = await admin
    .from("chat_messages")
    .select("course_id")
    .eq("role", "user");

  // 강사 평점
  const { data: ratings } = await admin
    .from("teacher_ratings")
    .select("course_id, rating");

  // 강의별 통계 집계
  type CourseStats = {
    title: string;
    description: string | null;
    teacherName: string;
    enrollCount: number;
    avgProgress: number;
    completionRate: number;
    avgQuizScore: number | null;
    chatCount: number;
    avgRating: number | null;
  };

  const statsMap: Record<string, CourseStats> = {};

  for (const c of courses ?? []) {
    const teacher = (c.profiles as unknown) as { full_name: string } | null;
    const cEnroll = (enrollments ?? []).filter((e) => e.course_id === c.id);
    const cQuiz = (quizResults ?? []).filter(
      (r) => (r.quizzes as unknown as { course_id: string } | null)?.course_id === c.id
    );
    const cChat = (chatMessages ?? []).filter((m) => m.course_id === c.id).length;
    const cRatings = (ratings ?? []).filter((r) => r.course_id === c.id);

    const enrollCount = cEnroll.length;
    const avgProgress = enrollCount > 0
      ? Math.round(cEnroll.reduce((s, e) => s + e.progress, 0) / enrollCount)
      : 0;
    const completedCount = cEnroll.filter((e) => e.status === "completed").length;
    const completionRate = enrollCount > 0 ? Math.round((completedCount / enrollCount) * 100) : 0;
    const avgQuizScore = cQuiz.length > 0
      ? Math.round(cQuiz.reduce((s, r) => s + r.score, 0) / cQuiz.length)
      : null;
    const avgRating = cRatings.length > 0
      ? Math.round((cRatings.reduce((s, r) => s + r.rating, 0) / cRatings.length) * 10) / 10
      : null;

    statsMap[c.id] = {
      title: c.title,
      description: c.description,
      teacherName: teacher?.full_name ?? "-",
      enrollCount,
      avgProgress,
      completionRate,
      avgQuizScore,
      chatCount: cChat,
      avgRating,
    };
  }

  // 분석 대상 선정
  const targetCourses = courseId
    ? Object.entries(statsMap).filter(([id]) => id === courseId)
    : Object.entries(statsMap);

  // 플랫폼 전체 통계
  const totalStudents = new Set((enrollments ?? []).map((e) => e.student_id)).size;
  const allEnroll = (enrollments ?? []).length;
  const allCompleted = (enrollments ?? []).filter((e) => e.status === "completed").length;
  const overallCompletionRate = allEnroll > 0 ? Math.round((allCompleted / allEnroll) * 100) : 0;
  const allScores = (quizResults ?? []).map((r) => r.score);
  const overallAvgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null;

  // 프롬프트 데이터 구성
  const platformSummary = `
플랫폼 전체 현황:
- 공개 강의 수: ${(courses ?? []).length}개
- 전체 수강생 수: ${totalStudents}명
- 전체 수강 등록: ${allEnroll}건
- 전체 수료율: ${overallCompletionRate}%
- AI 튜터 질문 수: ${(chatMessages ?? []).length}회
- 전체 평균 퀴즈 점수: ${overallAvgScore !== null ? `${overallAvgScore}점` : "데이터 없음"}`.trim();

  const coursesSummary = targetCourses.map(([, s]) => {
    const lines = [
      `강의명: ${s.title}`,
      `강사: ${s.teacherName}`,
      s.description ? `소개: ${s.description.slice(0, 100)}` : null,
      `수강생 수: ${s.enrollCount}명`,
      `평균 진도율: ${s.avgProgress}%`,
      `수료율: ${s.completionRate}%`,
      `AI 튜터 질문 수: ${s.chatCount}회`,
      s.avgQuizScore !== null ? `평균 퀴즈 점수: ${s.avgQuizScore}점` : null,
      s.avgRating !== null ? `강사 평점: ${s.avgRating}/5` : null,
    ].filter(Boolean).join("\n  ");
    return `[강의]\n  ${lines}`;
  }).join("\n\n");

  const systemPrompt = `당신은 에듀테크 플랫폼 전문 마케터이자 데이터 분석가입니다.
교육 플랫폼의 학습 데이터를 분석하여 강의 홍보와 수강생 유치를 위한 실질적인 마케팅 전략을 제안합니다.

답변 형식:
## 📊 데이터 기반 강의 강점 분석
(실제 수치를 근거로 강의의 경쟁력 분석)

## 🎯 타겟 수강생 프로필
(데이터에서 도출된 이상적인 수강생 특성 2~3가지)

## 💬 핵심 마케팅 메시지
(수치를 활용한 설득력 있는 홍보 문구 3~4가지 — 각 문구는 SNS/블로그/광고에 바로 쓸 수 있는 형태로)

## 📱 채널별 홍보 전략
(인스타그램, 블로그, 카카오톡 등 채널별 맞춤 전략)

## 🔧 수강생 유치를 위한 개선 제안
(데이터에서 발견된 약점 보완 방안 — 수료율, 진도율, AI 활용도 기반)

## ⚡ 즉시 실행 가능한 액션 플랜
(이번 주 당장 할 수 있는 3가지 마케팅 액션)

답변은 한국어로 작성하세요. 데이터 수치를 적극 인용하여 신뢰성을 높이고, 실행 가능한 조언을 구체적으로 제시하세요.`;

  const userMessage = `${platformSummary}

분석 대상 강의:
${coursesSummary}

${context ? `[운영자 추가 정보]\n${context}` : ""}

위 데이터를 분석하여 이 강의(들)의 마케팅 전략을 제안해주세요.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
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
        console.error("Marketing advice error:", e);
        controller.enqueue(new TextEncoder().encode("분석 중 오류가 발생했습니다. 다시 시도해주세요."));
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
