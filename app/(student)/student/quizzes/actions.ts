"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recalcProgress } from "@/app/(student)/student/actions";

async function getStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export type SubmitQuizState = {
  error?: string;
  score?: number;
  answers?: { question_index: number; selected_option: string; is_correct: boolean }[];
} | null;

export async function submitQuiz(
  _: SubmitQuizState,
  formData: FormData
): Promise<SubmitQuizState> {
  const { supabase, userId } = await getStudent();

  const quizId = formData.get("quiz_id") as string;
  if (!quizId) return { error: "퀴즈 정보를 찾을 수 없습니다." };

  // 퀴즈 문항 가져오기
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, questions, course_id")
    .eq("id", quizId)
    .single();

  if (!quiz) return { error: "퀴즈를 찾을 수 없습니다." };

  // 수강 여부 확인 (완강 후에도 퀴즈 재응시 허용)
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", userId)
    .eq("course_id", quiz.course_id)
    .single();

  if (!enrollment) return { error: "수강 중인 강의의 퀴즈만 풀 수 있습니다." };

  const questions = quiz.questions as {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];

  // 답안 채점
  const answers = questions.map((q, idx) => {
    const selected = formData.get(`answer_${idx}`) as string | null;
    return {
      question_index: idx,
      selected_option: selected ?? "",
      is_correct: selected === q.answer,
    };
  });

  const correctCount = answers.filter((a) => a.is_correct).length;
  const score = Math.round((correctCount / questions.length) * 100);

  const { error } = await supabase.from("quiz_results").insert({
    quiz_id: quizId,
    student_id: userId,
    answers,
    score,
  });

  if (error) return { error: "결과 저장 중 오류가 발생했습니다." };

  // 진도율 재계산 (퀴즈 포함)
  await recalcProgress(userId, quiz.course_id as string);

  revalidatePath("/student/quizzes");
  revalidatePath(`/student/courses/${quiz.course_id}`);
  revalidatePath("/student");
  return { score, answers };
}
