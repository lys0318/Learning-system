import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

const WANDBOX_URL = "https://wandbox.org/api/compile.json";

const LANG_CONFIG: Record<string, { compiler: string }> = {
  python: { compiler: "cpython-3.12.7" },
  java:   { compiler: "openjdk-jdk-21+35" },
  c:      { compiler: "gcc-13.2.0-c" },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, language, description, assignmentId } = await req.json();

  const lang = LANG_CONFIG[language];
  if (!lang) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });

  // 시도 횟수 계산
  const { count } = await supabase
    .from("assignment_submissions")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id);
  const attempt = (count ?? 0) + 1;

  // 1. Wandbox API로 코드 실행
  let stdout = "", stderr = "", runStatus = "error";
  try {
    const wandboxRes = await fetch(WANDBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, compiler: lang.compiler }),
    });
    const data = await wandboxRes.json();
    stdout = data.program_output ?? "";
    stderr = (data.compiler_error || data.program_error) ?? "";
    runStatus = String(data.status) === "0" ? "success" : "error";
  } catch {
    stderr = "코드 실행 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
    runStatus = "error";
  }

  // 2. Claude로 AI 피드백 생성
  let aiFeedback = "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `당신은 친절한 코딩 교육 전문가입니다. 학생의 코드를 분석하고 건설적인 피드백을 제공해주세요.

## 문제 지문
${description}

## 제출 언어
${language}

## 학생 코드
\`\`\`${language}
${code}
\`\`\`

## 실행 결과
- 상태: ${runStatus === "success" ? "정상 실행" : "오류 발생"}
- 출력(stdout): ${stdout || "(출력 없음)"}
- 오류(stderr): ${stderr || "(없음)"}

아래 형식으로 피드백을 작성해주세요:

### ✅ 전반적인 평가
코드가 문제를 해결했는지, 실행 결과에 대한 총평

### 👍 잘한 점
코드에서 잘 작성된 부분이나 올바른 접근 방식

### 💡 개선할 점
버그, 비효율, 가독성 문제 등 구체적으로 지적

### 🔑 힌트
정답을 직접 알려주지 말고, 스스로 개선할 수 있도록 방향만 제시

한국어로 작성하고, 학생을 격려하는 따뜻한 톤으로 작성해주세요.`,
      }],
    });
    aiFeedback = (msg.content[0] as { text: string }).text;
  } catch {
    aiFeedback = "AI 피드백 생성 중 오류가 발생했습니다.";
  }

  // 3. DB에 제출 기록 저장
  await supabase.from("assignment_submissions").insert({
    assignment_id: assignmentId,
    student_id: user.id,
    code,
    attempt,
    run_stdout: stdout,
    run_stderr: stderr,
    run_status: runStatus,
    ai_feedback: aiFeedback,
  });

  return NextResponse.json({ stdout, stderr, status: runStatus, aiFeedback, attempt });
}
