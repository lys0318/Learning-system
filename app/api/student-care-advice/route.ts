import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";

interface StudentData {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  progress: number;
  avgQuizScore: number | null;
  assignmentDone: number;
  assignmentTotal: number;
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
  if (profile?.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { students } = await req.json() as { students: StudentData[] };
  if (!students || students.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const teacherName = profile.full_name ?? "선생님";

  // 관심이 필요한 학생 필터링 (진도율 60% 미만 or 퀴즈 60점 미만 or 과제 미제출)
  const atRiskStudents = students.filter((s) => {
    const lowProgress = s.progress < 60;
    const lowQuiz = s.avgQuizScore !== null && s.avgQuizScore < 60;
    const noSubmission = s.assignmentTotal > 0 && s.assignmentDone === 0;
    return lowProgress || lowQuiz || noSubmission;
  });

  if (atRiskStudents.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const studentsSummary = atRiskStudents.map((s) => {
    const issues: string[] = [];
    if (s.progress < 60) issues.push(`진도율 ${s.progress}% (저조)`);
    if (s.avgQuizScore !== null && s.avgQuizScore < 60) issues.push(`퀴즈 평균 ${s.avgQuizScore}점`);
    if (s.avgQuizScore === null) issues.push("퀴즈 미응시");
    if (s.assignmentTotal > 0 && s.assignmentDone === 0) issues.push("과제 전혀 미제출");
    else if (s.assignmentTotal > 0) issues.push(`과제 ${s.assignmentDone}/${s.assignmentTotal} 제출`);

    return `학생명: ${s.studentName}
강의: ${s.courseName}
현황: ${issues.join(", ")}`;
  }).join("\n\n");

  const systemPrompt = `당신은 교육 전문가로, 선생님이 학생들에게 보낼 격려/조언 메시지를 작성합니다.
선생님의 이름은 "${teacherName}"입니다.

각 학생에 대해 다음 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
[
  {
    "studentName": "학생 이름",
    "reason": "관심이 필요한 이유 (1~2문장, 간결하게)",
    "message": "학생에게 보낼 따뜻한 격려/조언 메시지 (3~5문장, 친근하고 구체적으로)"
  }
]

메시지 작성 원칙:
- 학생을 비판하거나 부담을 주지 않기
- 구체적인 학습 데이터를 언급하여 선생님이 관심을 갖고 있음을 느끼게 하기
- 다음 행동을 유도하는 실질적인 조언 포함
- 따뜻하고 격려하는 톤 유지
- 한국어로 작성`;

  const userMessage = `다음 학생들에 대한 격려/조언 메시지를 작성해주세요:\n\n${studentsSummary}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "[]";

    // JSON 파싱
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ recommendations: [] });

    const aiRecommendations = JSON.parse(jsonMatch[0]) as {
      studentName: string;
      reason: string;
      message: string;
    }[];

    // atRiskStudents와 매핑
    const recommendations = atRiskStudents.map((s) => {
      const ai = aiRecommendations.find((r) => r.studentName === s.studentName);
      return {
        studentId: s.studentId,
        studentName: s.studentName,
        courseId: s.courseId,
        courseName: s.courseName,
        progress: s.progress,
        avgQuizScore: s.avgQuizScore,
        assignmentDone: s.assignmentDone,
        assignmentTotal: s.assignmentTotal,
        reason: ai?.reason ?? "학습 진행이 다소 저조합니다.",
        suggestedMessage: ai?.message ?? `${s.studentName} 학생, 꾸준히 학습에 임해주세요. 어려운 점이 있다면 언제든지 질문해주세요!`,
      };
    });

    return NextResponse.json({ recommendations });
  } catch (e) {
    console.error("Student care advice error:", e);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
