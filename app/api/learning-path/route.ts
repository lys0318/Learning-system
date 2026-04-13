import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";

const GOAL_MAX_LENGTH = 500;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`${user.id}:learning-path`, 5, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { goal } = await req.json() as { goal?: string };

  if (goal && goal.length > GOAL_MAX_LENGTH) {
    return NextResponse.json({ error: `학습 목표는 ${GOAL_MAX_LENGTH}자 이하로 입력해주세요.` }, { status: 400 });
  }

  // 수강 중인 강의 + 진도
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("progress, status, courses(id, title, description)")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false });

  // 퀴즈 결과
  const { data: quizResults } = await supabase
    .from("quiz_results")
    .select("score, quiz_id, quizzes(title, difficulty, course_id, courses(title))")
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(30);

  // 과제 제출 여부
  const courseIds = (enrollments ?? [])
    .map((e) => (e.courses as unknown as { id: string } | null)?.id)
    .filter(Boolean) as string[];

  const { data: assignments } = courseIds.length > 0
    ? await supabase
        .from("assignments")
        .select("id, title, course_id, courses(title)")
        .in("course_id", courseIds)
    : { data: [] };

  const { data: submissions } = courseIds.length > 0
    ? await supabase
        .from("assignment_submissions")
        .select("assignment_id")
        .eq("student_id", user.id)
    : { data: [] };

  const submittedIds = new Set((submissions ?? []).map((s) => s.assignment_id));

  // 수강하지 않은 강의 목록 (추천용)
  const { data: allCourses } = await supabase
    .from("courses")
    .select("id, title, description")
    .order("created_at", { ascending: false })
    .limit(20);

  const enrolledIds = new Set(courseIds);
  const availableCourses = (allCourses ?? []).filter((c) => !enrolledIds.has(c.id));

  // 프롬프트 데이터 구성
  const coursesSummary = (enrollments ?? []).map((e) => {
    const c = (e.courses as unknown) as { id: string; title: string; description: string | null } | null;
    return `- ${c?.title ?? "강의"}: 진도 ${e.progress}%, 상태: ${e.status === "completed" ? "완강" : "수강 중"}`;
  }).join("\n");

  // 퀴즈별 최고 점수만
  const bestScores: Record<string, { title: string; score: number; courseTitle: string; difficulty: string }> = {};
  for (const r of quizResults ?? []) {
    const q = (r.quizzes as unknown) as { title: string; difficulty: string; courses: { title: string } | null } | null;
    if (!q || bestScores[r.quiz_id]) continue;
    bestScores[r.quiz_id] = {
      title: q.title,
      score: r.score,
      courseTitle: q.courses?.title ?? "",
      difficulty: q.difficulty,
    };
  }
  const quizSummary = Object.values(bestScores).map((q) =>
    `- [${q.courseTitle}] ${q.title} (${q.difficulty === "easy" ? "쉬움" : q.difficulty === "hard" ? "어려움" : "보통"}): ${q.score}점`
  ).join("\n");

  const assignmentSummary = (assignments ?? []).map((a) => {
    const c = (a.courses as unknown) as { title: string } | null;
    const done = submittedIds.has(a.id);
    return `- [${c?.title ?? ""}] ${a.title}: ${done ? "제출 완료" : "미제출"}`;
  }).join("\n");

  const availableSummary = availableCourses.slice(0, 10).map((c) =>
    `- ${c.title}${c.description ? `: ${c.description.slice(0, 60)}` : ""}`
  ).join("\n");

  const systemPrompt = `당신은 학생의 학습 데이터를 분석하여 최적의 개인화 학습 경로를 설계해주는 AI 교육 코치입니다.
학생의 현재 상태를 정확히 진단하고, 구체적이고 실행 가능한 학습 로드맵을 제시하세요.

답변 형식:
## 📊 현재 학습 진단
(강의 진도, 퀴즈 성적, 과제 상황을 바탕으로 현재 학습 수준 분석)

## ✅ 잘 하고 있는 점
(강점 2~3가지)

## 🎯 집중해야 할 부분
(보완이 필요한 영역과 이유 2~3가지)

## 🗺️ 추천 학습 경로
(단계별 구체적 행동 계획 — 1주, 2주, 한 달 단위)

## 📚 추천 강의
(미수강 강의 중 다음 단계로 적합한 것 추천 및 이유)

## 💡 학습 팁
(이 학생에게 맞는 공부 방법 조언)

답변은 한국어로 작성하세요. 구체적이고 실용적으로 작성하되, 학생이 동기부여를 받을 수 있도록 긍정적인 톤을 유지하세요.`;

  const userMessage = `학생 이름: ${profile?.full_name ?? "학생"}

[수강 중인 강의]
${coursesSummary || "없음"}

[퀴즈 성적]
${quizSummary || "퀴즈 응시 기록 없음"}

[과제 현황]
${assignmentSummary || "과제 없음"}

[수강 가능한 강의 (미등록)]
${availableSummary || "없음"}

${goal ? `[학습 목표]\n${goal}` : ""}

위 데이터를 바탕으로 이 학생의 학습 경로를 분석하고 맞춤형 로드맵을 제시해주세요.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
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
        console.error("Learning path error:", e);
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
