import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";

interface TeacherData {
  teacherId: string;
  teacherName: string;
  courseCount: number;
  publishedCount: number;
  studentCount: number;
  completionRate: number;
  avgRating: number | null;
  ratingCount: number;
  qualityScore: number;
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

  const { teachers } = await req.json() as { teachers: TeacherData[] };
  if (!teachers || teachers.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // 관리가 필요한 강사 필터 (품질점수 70 미만)
  const atRiskTeachers = teachers.filter((t) => t.qualityScore < 70);

  if (atRiskTeachers.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const teachersSummary = atRiskTeachers.map((t) => {
    const issues: string[] = [];
    if (t.qualityScore < 40) issues.push("품질 점수 매우 저조 (관리 필요)");
    else if (t.qualityScore < 60) issues.push("품질 점수 보통");
    else issues.push("품질 점수 개선 필요");
    if (t.avgRating !== null && t.avgRating < 3.5) issues.push(`수강생 평점 ${t.avgRating}/5 (낮음)`);
    if (t.avgRating === null) issues.push("평점 없음 (평가 미실시)");
    if (t.completionRate < 40) issues.push(`수료율 ${t.completionRate}% (저조)`);
    if (t.studentCount === 0) issues.push("수강생 없음");
    if (t.publishedCount === 0) issues.push("공개 강의 없음");

    return `강사명: ${t.teacherName}
공개 강의: ${t.publishedCount}개 / 전체 ${t.courseCount}개
수강생 수: ${t.studentCount}명
수료율: ${t.completionRate}%
평점: ${t.avgRating !== null ? `${t.avgRating}/5 (${t.ratingCount}개 평가)` : "평가 없음"}
품질 점수: ${t.qualityScore}점
현황: ${issues.join(", ")}`;
  }).join("\n\n");

  const systemPrompt = `당신은 에듀테크 플랫폼 교육 운영자입니다. 강사 성과 데이터를 분석하여 강사에게 보낼 관리/지원 메시지를 작성합니다.

각 강사에 대해 다음 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
[
  {
    "teacherName": "강사 이름",
    "reason": "관리가 필요한 이유 (1~2문장, 간결하게)",
    "message": "강사에게 보낼 전문적이고 격려하는 메시지 (3~5문장, 구체적 개선 방향 포함)"
  }
]

메시지 작성 원칙:
- 강사를 비판하거나 압박감을 주지 않기
- 실제 데이터 수치를 언급하여 운영자가 주의 깊게 모니터링하고 있음을 느끼게 하기
- 구체적이고 실행 가능한 개선 방향 제시
- 지원과 협력의 톤 유지 (명령이 아닌 제안)
- 한국어로 작성`;

  const userMessage = `다음 강사들에 대한 관리/지원 메시지를 작성해주세요:\n\n${teachersSummary}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ recommendations: [] });

    const aiRecommendations = JSON.parse(jsonMatch[0]) as {
      teacherName: string;
      reason: string;
      message: string;
    }[];

    const recommendations = atRiskTeachers.map((t) => {
      const ai = aiRecommendations.find((r) => r.teacherName === t.teacherName);
      return {
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        qualityScore: t.qualityScore,
        completionRate: t.completionRate,
        avgRating: t.avgRating,
        studentCount: t.studentCount,
        reason: ai?.reason ?? "강의 품질 지표가 기준에 미달합니다.",
        suggestedMessage: ai?.message ?? `${t.teacherName} 강사님, 최근 강의 현황을 검토해보았습니다. 수강생들의 학습 경험 향상을 위해 함께 노력해주시면 감사하겠습니다.`,
      };
    });

    return NextResponse.json({ recommendations });
  } catch (e) {
    console.error("Teacher care advice error:", e);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
