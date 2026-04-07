"use client";

import { useActionState, useState } from "react";
import {
  submitQuiz,
  type SubmitQuizState,
} from "@/app/(student)/student/quizzes/actions";
import Link from "next/link";

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface Props {
  quizId: string;
  title: string;
  questions: Question[];
}

export default function QuizPlayer({ quizId, title, questions }: Props) {
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [state, action, isPending] = useActionState<SubmitQuizState, FormData>(
    submitQuiz,
    null
  );

  // 제출 완료 → 결과 화면
  if (state?.score !== undefined && state.answers) {
    const { score, answers } = state;
    return (
      <div className="space-y-6">
        {/* 점수 */}
        <div className="bg-[#16213e] rounded-2xl border border-gray-700/50 p-8 text-center">
          <p className="text-gray-400 text-sm mb-2">최종 점수</p>
          <p
            className={`text-6xl font-bold mb-2 ${score >= 70 ? "text-green-400" : "text-yellow-400"}`}
          >
            {score}
          </p>
          <p className="text-gray-400 text-sm">
            {questions.length}문항 중{" "}
            {answers.filter((a) => a.is_correct).length}개 정답
          </p>
        </div>

        {/* 문항별 해설 */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const a = answers[idx];
            const isCorrect = a?.is_correct;
            return (
              <div
                key={idx}
                className={`bg-[#16213e] rounded-xl border p-5 ${isCorrect ? "border-green-500/30" : "border-red-500/30"}`}
              >
                <div className="flex items-start gap-2 mb-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isCorrect ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}
                  >
                    {isCorrect ? "정답" : "오답"}
                  </span>
                  <p className="text-sm font-medium">
                    Q{idx + 1}. {q.question}
                  </p>
                </div>
                <ul className="space-y-1.5 mb-3">
                  {q.options.map((opt) => {
                    const isAnswer = opt === q.answer;
                    const isMyChoice = opt === a?.selected_option;
                    return (
                      <li
                        key={opt}
                        className={`text-sm px-3 py-1.5 rounded-lg ${
                          isAnswer
                            ? "bg-green-400/20 text-green-300 font-medium"
                            : isMyChoice && !isAnswer
                              ? "bg-red-400/20 text-red-300 line-through"
                              : "text-gray-400"
                        }`}
                      >
                        {isAnswer ? "✓ " : isMyChoice && !isAnswer ? "✗ " : ""}
                        {opt}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
                  💡 {q.explanation}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Link
            href="/student/quizzes"
            className="flex-1 py-3 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-center transition-colors"
          >
            퀴즈 목록으로
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            다시 풀기
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(selected).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <form
      action={(formData) => {
        Object.entries(selected).forEach(([idx, val]) => {
          formData.set(`answer_${idx}`, val);
        });
        formData.set("quiz_id", quizId);
        action(formData);
      }}
      className="space-y-5"
    >
      <input type="hidden" name="quiz_id" value={quizId} />

      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
        <span>{title}</span>
        <span>
          {answeredCount}/{questions.length} 답변 완료
        </span>
      </div>

      {questions.map((q, idx) => (
        <div
          key={idx}
          className={`bg-[#16213e] rounded-xl border p-5 transition-colors ${
            selected[idx]
              ? "border-blue-500/40"
              : "border-gray-700/50"
          }`}
        >
          <p className="text-sm font-medium mb-3">
            <span className="text-blue-400 mr-1.5">Q{idx + 1}.</span>
            {q.question}
          </p>
          <ul className="space-y-2">
            {q.options.map((opt) => (
              <li key={opt}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name={`answer_${idx}`}
                    value={opt}
                    checked={selected[idx] === opt}
                    onChange={() =>
                      setSelected((prev) => ({ ...prev, [idx]: opt }))
                    }
                    className="accent-blue-500 w-4 h-4 shrink-0"
                  />
                  <span
                    className={`text-sm transition-colors ${
                      selected[idx] === opt
                        ? "text-white"
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                  >
                    {opt}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {state?.error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!allAnswered || isPending}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
      >
        {isPending
          ? "제출 중..."
          : allAnswered
            ? "답안 제출"
            : `${questions.length - answeredCount}문항 남음`}
      </button>
    </form>
  );
}
